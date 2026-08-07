/**
 * DWIP Enterprise - VOS API Router
 * Sprint 1 Architecture - Platform Foundation Endpoints
 */

import { Router } from 'express';
import { VosCorePlatform } from '../../core/vos';
import { authenticateJwt } from '../middleware/auth.ts';

export const vosRouter = Router();

/**
 * POST /api/vos/gate-in
 * Create a new Vehicle Operational Session on Gate In
 */
vosRouter.post('/gate-in', async (req, res) => {
  try {
    const { vin, registrationNumber, actorId, actorRole } = req.body;
    if (!vin || !registrationNumber) {
      return res.status(400).json({ success: false, error: 'vin and registrationNumber are mandatory' });
    }

    const session = await VosCorePlatform.vos.createSession(
      vin,
      registrationNumber,
      actorId || 'usr_sec_agent',
      actorRole || 'security_agent'
    );

    return res.status(201).json({ success: true, data: session });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vos/:id/operational-readiness
 * Set Operational Readiness on VOS
 */
vosRouter.post('/:id/operational-readiness', async (req, res) => {
  try {
    const { id } = req.params;
    const { actorId, actorRole } = req.body;

    const session = await VosCorePlatform.vos.setOperationalReadiness(
      id,
      actorId || 'usr_sa_1',
      actorRole || 'service_advisor'
    );

    return res.json({ success: true, data: session });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vos/:id/transition
 * Transition VOS state
 */
vosRouter.post('/:id/transition', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetState, actorId, actorRole, reason } = req.body;

    const session = VosCorePlatform.vos.getSession(id);
    const updated = await VosCorePlatform.state.transitionState(
      session,
      targetState,
      actorId || 'usr_supervisor',
      actorRole || 'supervisor',
      reason
    );

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vos/:id/attach-job-card
 * Attach OEM Job Card milestone (requires Operational Readiness)
 */
vosRouter.post('/:id/attach-job-card', async (req, res) => {
  try {
    const { id } = req.params;
    const { jobCardNumber, actorId, actorRole } = req.body;

    const session = await VosCorePlatform.vos.attachOemJobCard(
      id,
      jobCardNumber,
      actorId || 'usr_sa_1',
      actorRole || 'service_advisor'
    );

    return res.json({ success: true, data: session });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vos/:id/transfer-ownership
 * Transfer VOS ownership/custody between roles
 */
vosRouter.post('/:id/transfer-ownership', async (req, res) => {
  try {
    const { id } = req.params;
    const { fromUserId, toUserId, fromRole, toRole, reason } = req.body;

    const record = await VosCorePlatform.ownership.transferOwnership({
      vosId: id,
      fromUserId,
      toUserId,
      fromRole,
      toRole,
      reason
    });

    return res.json({ success: true, data: record });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vos/:id/request-deviation
 * Request an exception deviation
 */
vosRouter.post('/:id/request-deviation', async (req, res) => {
  try {
    const { id } = req.params;
    const { deviationType, reason, requestedBy } = req.body;

    const deviation = await VosCorePlatform.vos.requestDeviation(
      id,
      deviationType,
      reason,
      requestedBy || 'usr_sa_1'
    );

    return res.status(201).json({ success: true, data: deviation });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vos/deviations/:id/approve
 * Approve an exception deviation
 */
vosRouter.post('/deviations/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const deviation = await VosCorePlatform.vos.approveDeviation(
      id,
      approvedBy || 'usr_gm_1'
    );

    return res.json({ success: true, data: deviation });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vos/:id/gate-out
 * Gate Out / Close VOS (requires OEM Job Card OR Approved Deviation)
 */
vosRouter.post('/:id/gate-out', async (req, res) => {
  try {
    const { id } = req.params;
    const { actorId, actorRole } = req.body;

    const session = await VosCorePlatform.vos.gateOut(
      id,
      actorId || 'usr_sec_agent',
      actorRole || 'security_agent'
    );

    return res.json({ success: true, data: session });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/vos/all
 * Query all VOS sessions with Server-Side Row-Level Scoping
 */
vosRouter.get('/all', authenticateJwt, (req: any, res: any) => {
  const user = req.user;
  const role = (user?.role || "").toLowerCase().trim().replace(/_/g, " ");
  const isManager = ["service manager", "works manager", "workshop manager", "general manager", "admin", "cashier"].includes(role);

  let sessions = VosCorePlatform.vos.getAllSessions() || [];

  if (!isManager && role === "service advisor") {
    const username = (user?.username || "").toLowerCase().trim();
    const fullName = (user?.full_name || user?.name || "").toLowerCase().trim();
    sessions = sessions.filter((s: any) => {
      const owner = (s.current_owner || s.assigned_advisor || s.advisor || "").toLowerCase().trim();
      return owner === username || owner === fullName || owner.includes(fullName) || owner.includes(username);
    });
  } else if (!isManager && (role === "technician" || role === "lead technician")) {
    const username = (user?.username || "").toLowerCase().trim();
    const fullName = (user?.full_name || user?.name || "").toLowerCase().trim();
    sessions = sessions.filter((s: any) => {
      const tech = (s.assigned_technician || s.current_owner || "").toLowerCase().trim();
      return tech === username || tech === fullName || tech.includes(fullName) || tech.includes(username);
    });
  }

  return res.json({ success: true, count: sessions.length, data: sessions });
});

/**
 * GET /api/vos/:id
 * Retrieve VOS session details
 */
vosRouter.get('/:id', (req, res) => {
  try {
    const session = VosCorePlatform.vos.getSession(req.params.id);
    const deviations = VosCorePlatform.vos.getDeviationsForVos(req.params.id);
    const ownershipHistory = VosCorePlatform.ownership.getHistoryForVos(req.params.id);
    const transitions = VosCorePlatform.audit.getTransitionsForVos(req.params.id);

    return res.json({
      success: true,
      data: {
        session,
        deviations,
        ownershipHistory,
        transitions
      }
    });
  } catch (err: any) {
    return res.status(404).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/vos/:id/timeline
 * Retrieve dual timeline nodes
 */
vosRouter.get('/:id/timeline', (req, res) => {
  const { type } = req.query;
  const nodes = VosCorePlatform.timeline.getTimelineForVos(
    req.params.id,
    type as any
  );
  return res.json({ success: true, data: nodes });
});
