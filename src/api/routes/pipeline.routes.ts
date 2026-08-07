/**
 * DWIP Enterprise - Phase 3 Real-Time Ownership Pipeline Router
 * Gate-In → Reception → Manager Assignment
 */

import { Router } from 'express';
import { authenticateJwt } from '../middleware/auth';
import { RealtimeOwnershipPipeline } from '../../core/workshop/realtime-ownership-pipeline';

export const pipelineRouter = Router();

/**
 * POST /api/pipeline/gate-in
 * Security Gate-In vehicle capture & initial SLA timer creation
 */
pipelineRouter.post('/gate-in', authenticateJwt, async (req: any, res: any) => {
  try {
    const { vrn } = req.body;
    if (!vrn) {
      return res.status(400).json({ success: false, error: 'Vehicle Registration Number (vrn) is mandatory.' });
    }

    const result = await RealtimeOwnershipPipeline.createGateIn(req.body, req.user);
    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/pipeline/vehicle-passport/:vrn
 * Look up immutable vehicle passport & previous visit history
 */
pipelineRouter.get('/vehicle-passport/:vrn', authenticateJwt, async (req: any, res: any) => {
  try {
    const result = await RealtimeOwnershipPipeline.lookupVehiclePassport(req.params.vrn);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/pipeline/reception/queue
 * Receptionist MY NEW ARRIVALS queue
 */
pipelineRouter.get('/reception/queue', authenticateJwt, async (req: any, res: any) => {
  try {
    const branchId = req.user?.branchId || req.user?.branch_id || 'BR-SEDAM';
    const queue = await RealtimeOwnershipPipeline.getReceptionQueue(branchId);
    return res.json({ success: true, count: queue.length, data: queue });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/pipeline/reception/accept
 * Receptionist intake acceptance, token generation & odometer verification
 */
pipelineRouter.post('/reception/accept', authenticateJwt, async (req: any, res: any) => {
  try {
    const { gateEntryId, visitCategory, confirmedOdometer } = req.body;
    if (!gateEntryId || !visitCategory || confirmedOdometer === undefined) {
      return res.status(400).json({
        success: false,
        error: 'gateEntryId, visitCategory, and confirmedOdometer are mandatory.'
      });
    }

    const role = (req.user?.role || '').toLowerCase().trim().replace(/_/g, ' ');
    if (role === 'security_agent' || role === 'security agent') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Security agents cannot accept reception intake.' });
    }

    const result = await RealtimeOwnershipPipeline.acceptReceptionIntake(req.body, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/pipeline/manager/queue
 * Manager MY ASSIGNMENTS PENDING queue
 */
pipelineRouter.get('/manager/queue', authenticateJwt, async (req: any, res: any) => {
  try {
    const role = (req.user?.role || '').toLowerCase().trim().replace(/_/g, ' ');
    const isAuthorized = ['service manager', 'works manager', 'workshop manager', 'general manager', 'admin'].includes(role);

    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Manager role required to access pending assignment queue.' });
    }

    const branchId = req.user?.branchId || req.user?.branch_id || 'BR-SEDAM';
    const queue = await RealtimeOwnershipPipeline.getManagerPendingQueue(branchId);
    return res.json({ success: true, count: queue.length, data: queue });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/pipeline/manager/recommendation/:intakeId
 * AI / Rule Service Advisor Recommendation Engine
 */
pipelineRouter.get('/manager/recommendation/:intakeId', authenticateJwt, async (req: any, res: any) => {
  try {
    const branchId = req.user?.branchId || req.user?.branch_id || 'BR-SEDAM';
    const rec = await RealtimeOwnershipPipeline.generateAdvisorRecommendation(req.params.intakeId, branchId);
    return res.json({ success: true, data: rec });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/pipeline/manager/assign
 * Manager SA Assignment & Atomic Ownership Transfer
 */
pipelineRouter.post('/manager/assign', authenticateJwt, async (req: any, res: any) => {
  try {
    const { intakeId, gateEntryId, assignedSaId, assignedSaName } = req.body;
    if (!intakeId || !gateEntryId || !assignedSaId || !assignedSaName) {
      return res.status(400).json({
        success: false,
        error: 'intakeId, gateEntryId, assignedSaId, and assignedSaName are mandatory.'
      });
    }

    const role = (req.user?.role || '').toLowerCase().trim().replace(/_/g, ' ');
    const isAuthorized = ['service manager', 'works manager', 'workshop manager', 'general manager', 'admin'].includes(role);

    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only authorized Managers can assign Service Advisors.' });
    }

    const result = await RealtimeOwnershipPipeline.assignServiceAdvisor(req.body, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/pipeline/sla/breaches
 * Evaluate 5-minute handoff SLA breaches
 */
pipelineRouter.get('/sla/breaches', authenticateJwt, async (req: any, res: any) => {
  try {
    const branchId = req.user?.branchId || req.user?.branch_id || 'BR-SEDAM';
    const result = await RealtimeOwnershipPipeline.evaluateHandoffSlaEscalations(branchId);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
