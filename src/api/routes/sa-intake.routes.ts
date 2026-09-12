/**
 * DWIP Enterprise - Phase 4 Service Advisor Technical Intake Router
 * Technical Intake → Odometer Audit → Complaint Authentication → JC Decision → Floor Handoff
 */

import { Router } from 'express';
import { authenticateJwt } from '../middleware/auth';
import { SaTechnicalIntakeEngine } from '../../core/workshop/sa-technical-intake';
import { canPerformSaIntake } from '../../core/workshop/assignment-roles';

export const saIntakeRouter = Router();

/**
 * AUDIT P0: every route below already ran authenticateJwt, but NOT ONE carried a
 * role check — so any authenticated user (a technician, a cashier, a driver)
 * could record complaints, create a job card, reconcile CRM or send a vehicle to
 * the floor as though they were the Service Advisor. Compare
 * floor-execution.routes.ts, which correctly pairs authenticateJwt with
 * requireFloorRoles on every route.
 *
 * Applied at router level so a newly added route cannot silently miss it — the
 * absence of a default was how all nine routes came to be unguarded.
 */
saIntakeRouter.use(authenticateJwt, (req: any, res: any, next: any) => {
  if (!canPerformSaIntake(req.user?.role)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Service Advisor technical intake is restricted to advisors and managers.',
    });
  }
  next();
});

/**
 * GET /api/sa-intake/queue
 * Returns vehicles assigned to logged-in SA awaiting intake or in intake WIP
 */
saIntakeRouter.get('/queue', authenticateJwt, async (req: any, res: any) => {
  try {
    const saId = req.user?.id || req.user?.user_id || 'usr_service_advisor';
    const saName = req.user?.full_name || req.user?.username || 'Service Advisor';
    const branchId = req.user?.branchId || req.user?.branch_id || 'BR-SEDAM';

    const queue = await SaTechnicalIntakeEngine.getSaAssignedQueue(saId, saName, branchId);
    return res.json({ success: true, count: queue.length, data: queue });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/sa-intake/start
 * Starts SA technical intake for assigned vehicle
 */
saIntakeRouter.post('/start', authenticateJwt, async (req: any, res: any) => {
  try {
    const { gateEntryId } = req.body;
    if (!gateEntryId) {
      return res.status(400).json({ success: false, error: 'gateEntryId is mandatory.' });
    }

    const result = await SaTechnicalIntakeEngine.startIntake(gateEntryId, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/sa-intake/verify-odometer
 * Physical odometer tri-state verification & audit
 */
saIntakeRouter.post('/verify-odometer', authenticateJwt, async (req: any, res: any) => {
  try {
    const { gateEntryId, saVerifiedOdometer } = req.body;
    if (!gateEntryId || saVerifiedOdometer === undefined) {
      return res.status(400).json({ success: false, error: 'gateEntryId and saVerifiedOdometer are mandatory.' });
    }

    const result = await SaTechnicalIntakeEngine.verifyOdometer(req.body, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/sa-intake/authenticate-complaints
 * Capture & authenticate customer/driver complaints
 */
saIntakeRouter.post('/authenticate-complaints', authenticateJwt, async (req: any, res: any) => {
  try {
    const { gateEntryId, complaintSource, complaints } = req.body;
    if (!gateEntryId || !complaintSource || !complaints) {
      return res.status(400).json({ success: false, error: 'gateEntryId, complaintSource, and complaints array are mandatory.' });
    }

    const result = await SaTechnicalIntakeEngine.authenticateComplaints(req.body, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/sa-intake/amend-complaints
 * Amend authenticated complaints with mandatory audit trail
 */
saIntakeRouter.post('/amend-complaints', authenticateJwt, async (req: any, res: any) => {
  try {
    const { intakeId, newComplaints, amendmentReason } = req.body;
    if (!intakeId || !newComplaints || !amendmentReason) {
      return res.status(400).json({ success: false, error: 'intakeId, newComplaints, and amendmentReason are mandatory.' });
    }

    const result = await SaTechnicalIntakeEngine.amendAuthenticatedComplaints(req.body, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/sa-intake/intelligence/:vrn
 * Service History, Repeat Failure, FSV, & Warranty Pre-screen Intelligence
 */
saIntakeRouter.get('/intelligence/:vrn', authenticateJwt, async (req: any, res: any) => {
  try {
    const odo = Number(req.query.odo || 0);
    const complaintsJson = req.query.complaints ? JSON.parse(decodeURIComponent(req.query.complaints as string)) : [];

    const repeat = await SaTechnicalIntakeEngine.evaluateRepeatFailures(req.params.vrn, complaintsJson);
    const fsv = await SaTechnicalIntakeEngine.evaluateFsvEligibility(req.params.vrn, odo);
    const warranty = await SaTechnicalIntakeEngine.evaluateWarrantyPreScreen(req.params.vrn, odo, complaintsJson);

    return res.json({
      success: true,
      data: {
        vrn: req.params.vrn,
        repeatFailureIntelligence: repeat,
        fsvEligibility: fsv,
        warrantyPreScreen: warranty
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/sa-intake/create-job-card
 * Validate authorization gate & create CRM or DWIP Temp Job Card
 */
saIntakeRouter.post('/create-job-card', authenticateJwt, async (req: any, res: any) => {
  try {
    const result = await SaTechnicalIntakeEngine.createJobCard(req.body, req.user);
    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    // A gate entry whose intake is already complete is not a failed request —
    // the work exists. 409 Conflict, and carry the structured details through
    // so the client can offer to amend the existing intake instead of showing
    // the advisor a dead end. Flattening this to err.message alone is what left
    // the UI with nothing to act on.
    if (err?.code === 'INTAKE_ALREADY_COMPLETED') {
      return res.status(409).json({
        success: false,
        code: err.code,
        error: err.message,
        existing: err.existing,
      });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/sa-intake/reconcile-crm
 * Reconcile DWIP Temp JC to CRM JC
 */
saIntakeRouter.post('/reconcile-crm', authenticateJwt, async (req: any, res: any) => {
  try {
    const { tempJcNo, crmJcNo } = req.body;
    if (!tempJcNo || !crmJcNo) {
      return res.status(400).json({ success: false, error: 'tempJcNo and crmJcNo are mandatory.' });
    }

    const result = await SaTechnicalIntakeEngine.reconcileCrmJobCard(tempJcNo, crmJcNo, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/sa-intake/send-to-floor
 * Send Job Card to Floor In-Charge & start 5-minute handoff SLA
 */
saIntakeRouter.post('/send-to-floor', authenticateJwt, async (req: any, res: any) => {
  try {
    const { jobCardId, gateEntryId } = req.body;
    if (!jobCardId || !gateEntryId) {
      return res.status(400).json({ success: false, error: 'jobCardId and gateEntryId are mandatory.' });
    }

    const result = await SaTechnicalIntakeEngine.sendToFloor(req.body, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
