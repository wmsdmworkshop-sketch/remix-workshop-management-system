import { Router, Request, Response } from 'express';
import { RealtimeOwnershipPipeline } from '../../core/workshop/realtime-ownership-pipeline.ts';

export const devopsRouter = Router();

import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client();

/**
 * Middleware to enforce Cloud Scheduler / Cloud Run machine-to-machine auth.
 * 
 * CONTROL 2: SECURE CLOUD SCHEDULER EXECUTION
 * This route must reject normal workshop users and browser JWTs.
 * It expects a Google Cloud OIDC token in the Authorization header.
 */
async function authenticateCloudScheduler(req: Request, res: Response, next: any) {
  // If we are in local development, we might bypass or use a specific dev header
  if (process.env.NODE_ENV === 'development' && req.headers['x-dev-scheduler-bypass'] === 'true') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: "MACHINE_AUTH_REQUIRED",
      message: "Missing Bearer token. This endpoint requires a Google Cloud OIDC token."
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    // Determine the expected audience for the Cloud Run service
    const audience = process.env.CLOUD_RUN_URL || process.env.WORKSHOP_API_URL;
    if (!audience) {
      console.warn("WARN: CLOUD_RUN_URL is not set for OIDC verification. Using fallback.");
    }
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: audience || 'https://dwip-scheduler-audience'
    });
    const payload = ticket.getPayload();
    
    // Ensure the token comes from a valid service account email
    if (!payload?.email?.endsWith('.gserviceaccount.com')) {
      return res.status(403).json({
        success: false,
        error: "INVALID_SERVICE_ACCOUNT",
        message: "Token does not belong to a valid Google Cloud service account."
      });
    }

    // Verify Cloud Scheduler header (added defense-in-depth)
    if (process.env.NODE_ENV === 'production' && req.headers['x-cloudscheduler'] !== 'true') {
      return res.status(403).json({
        success: false,
        error: "MISSING_SCHEDULER_HEADER",
        message: "Request lacks X-Cloudscheduler header."
      });
    }

  } catch (err: any) {
    return res.status(403).json({
      success: false,
      error: "UNAUTHORIZED_INVOCATION",
      message: `OIDC Verification Failed: ${err.message}`
    });
  }

  // Pass execution
  next();
}

/**
 * POST /api/v1/devops/cron/sla-evaluator
 * Idempotent, race-safe SLA evaluator intended to be called 1x/minute by Cloud Scheduler.
 */
devopsRouter.post('/cron/sla-evaluator', authenticateCloudScheduler, async (req: Request, res: Response) => {
  try {
    // We evaluate for all active branches. For simplicity in this iteration, we use a default branch 
    // or iterate over branches. In production, this would fetch active branches from DB.
    const branchId = req.body.branchId || 'BR-SEDAM'; // Defaulting to Sedam for now
    
    const result = await RealtimeOwnershipPipeline.evaluateHandoffSlaEscalations(branchId);
    
    // Do not expose sensitive employee/customer data; return deterministic execution stats
    res.status(200).json(result);
  } catch (error: any) {
    console.error("SLA Evaluator Error:", error);
    res.status(500).json({
      success: false,
      error: "EVALUATOR_FAILED",
      message: error.message
    });
  }
});
