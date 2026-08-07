import { Router } from 'express';
import { authenticateJwt } from '../middleware/auth';
import { OperationsCommandCenter } from '../../core/workshop/operations-command-center';

export const commandCenterRouter = Router();

/**
 * GET /api/v1/command/operational-truth/:identifier
 * Step 4 & 6: Build operational truth aggregation API / 20-question drill down
 */
commandCenterRouter.get('/operational-truth/:identifier', authenticateJwt, async (req: any, res: any) => {
  try {
    const branchId = req.user?.branchId || req.user?.branch_id || 'BR-SEDAM';
    const truth = await OperationsCommandCenter.getOperationalTruth(req.params.identifier, branchId);
    return res.json({ success: true, data: truth });
  } catch (error: any) {
    if (error.message.includes('NOT_FOUND')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/command/exceptions
 * Step 5: Implement command-center exception queues
 */
commandCenterRouter.get('/exceptions', authenticateJwt, async (req: any, res: any) => {
  try {
    const branchId = req.query.branchId || req.user?.branchId || req.user?.branch_id || 'BR-SEDAM';
    
    // In Phase 10, exceptions are primarily breached SLAs, overrides, and manual gate passes
    const exceptions = await OperationsCommandCenter.getExceptionQueues(branchId);
    return res.json({ success: true, data: exceptions });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
