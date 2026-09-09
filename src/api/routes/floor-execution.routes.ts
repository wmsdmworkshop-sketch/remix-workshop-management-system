import { Router, Request, Response } from "express";
import { floorExecutionEngine } from "../../core/workshop/floor-execution-engine";
import { authenticateJwt } from "../middleware/auth.ts";

export const floorExecutionRouter = Router();

const normaliseRole = (role: unknown) => String(role || "").toLowerCase().trim().replace(/[\s_]+/g, "_");

function requireFloorRoles(allowedRoles: string[]) {
  const allowed = new Set(allowedRoles.map(normaliseRole));
  return (req: any, res: any, next: any) => {
    if (!req.user || !allowed.has(normaliseRole(req.user.role))) {
      return res.status(403).json({ success: false, error: "FLOOR_ROLE_FORBIDDEN" });
    }
    next();
  };
}

// (A GLOBAL_CONTEXT_ROLES set used to live here. Its only purpose was deciding
// who was exempt from the branch-context refusal in requireAuthenticatedUser,
// and that refusal is gone — see the note there. Cross-branch access is reasoned
// about in AuthorizationService.checkBranchAccess(), not here.)

function requireAuthenticatedUser(req: any): { id: string; name: string; branchId: string; role: string } {
  const user = req.user;
  if (!user?.id) {
    throw new Error("AUTHENTICATED_USER_CONTEXT_REQUIRED");
  }
  const role = normaliseRole(user.role);
  // NOTE: this used to throw AUTHENTICATED_USER_CONTEXT_REQUIRED when a
  // branch-scoped role had no branchId, on the reasoning that guessing a branch
  // could leak cross-branch data. In practice it blocked the entire floor lane
  // for every real user, because NO account can currently have a branch:
  //
  //   `workshops` table has 0 rows
  //     -> employees.workshop_id is NULL for all 51 employees
  //     -> resolveWorkshopId() (server.ts:95) returns null
  //     -> the JWT is signed with workshop_id: null
  //     -> auth.ts cannot derive branchId
  //     -> this guard refused every branch-scoped role
  //
  // Only admin/developer/gm_service passed, via GLOBAL_CONTEXT_ROLES — which is
  // why it stayed invisible until a real floor_supervisor logged in and saw
  // AUTHENTICATED_USER_CONTEXT_REQUIRED on an otherwise working screen.
  //
  // There is no cross-branch leak to protect against here: this deployment is
  // single-branch, and tbl_bays, tbl_sa_intake and tbl_manager_assignment all
  // contain "BR-SEDAM" and nothing else. So a missing branch resolves to that
  // same literal already used below for global-context roles, rather than
  // refusing the request.
  //
  // REVISIT WHEN A SECOND BRANCH EXISTS: at that point branchId must come from
  // real data (seed `workshops`, populate employees.workshop_id) and this
  // default must be removed — note also that workshops.workshop_id is numeric
  // while these tables key on the string "BR-SEDAM", so the two id styles have
  // to be reconciled before any of that is meaningful.
  return {
    id: String(user.id ?? user.userId ?? user.user_id),
    name: user.full_name || user.fullName || user.username || String(user.id),
    // Global-context roles with no linked branch get the same "BR-SEDAM"
    // literal every floor-execution-engine method already defaults its own
    // `branchId` parameter to when the caller passes nothing — this
    // subsystem is single-branch today, so that's the real branch, not a
    // fabricated one. (Passing "" here would NOT trigger those defaults —
    // JS default params only fire on `undefined` — so it has to be spelled
    // out explicitly rather than left blank.)
    branchId: user.branchId != null ? String(user.branchId) : "BR-SEDAM",
    role,
  };
}

const FLOOR_CONTROL_ROLES = ["floor_supervisor", "floor_incharge", "supervisor", "service_manager", "works_manager", "workshop_manager", "gm_service", "admin", "developer"];
const FLOOR_EXECUTION_ROLES = ["technician", "lead_technician", ...FLOOR_CONTROL_ROLES];

/**
 * GET /api/floor-execution/new-jobs
 */
floorExecutionRouter.get("/new-jobs", authenticateJwt, requireFloorRoles(FLOOR_CONTROL_ROLES), async (req: Request, res: Response) => {
  try {
    const user = requireAuthenticatedUser(req);
    const queue = await floorExecutionEngine.getFloorPendingQueue(user.id, user.branchId);
    res.json({ success: true, count: queue.length, data: queue });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/acknowledge-handoff
 */
floorExecutionRouter.post("/acknowledge-handoff", authenticateJwt, requireFloorRoles(FLOOR_CONTROL_ROLES), async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.body;
    const user = requireAuthenticatedUser(req);
    const result = await floorExecutionEngine.acknowledgeFloorHandoff(jobCardId, user.id, user.name);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/floor-execution/bays
 */
floorExecutionRouter.get("/bays", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const bays = await floorExecutionEngine.getBaysStatus(requireAuthenticatedUser(req).branchId);
    res.json({ success: true, data: bays });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/floor-execution/technicians
 */
floorExecutionRouter.get("/technicians", authenticateJwt, requireFloorRoles(FLOOR_CONTROL_ROLES), async (req: Request, res: Response) => {
  try {
    const techs = await floorExecutionEngine.getTechniciansRoster(requireAuthenticatedUser(req).branchId);
    res.json({ success: true, data: techs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/recommend-allocation
 */
floorExecutionRouter.post("/recommend-allocation", authenticateJwt, requireFloorRoles(FLOOR_CONTROL_ROLES), async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.body;
    const suggestion = await floorExecutionEngine.generateBayTechRecommendation(jobCardId, requireAuthenticatedUser(req).branchId);
    res.json({ success: true, data: suggestion });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/allocate
 */
floorExecutionRouter.post("/allocate", authenticateJwt, requireFloorRoles(FLOOR_CONTROL_ROLES), async (req: Request, res: Response) => {
  try {
    const { jobCardId, bayId, technicianId, technicianName, isOverride, overrideReason } = req.body;
    const user = requireAuthenticatedUser(req);

    const allocation = await floorExecutionEngine.allocateJobAndBay(
      jobCardId,
      bayId,
      technicianId,
      technicianName,
      user.name,
      isOverride,
      overrideReason,
      user.branchId
    );
    res.json({ success: true, data: allocation });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/floor-execution/tech-work
 */
floorExecutionRouter.get("/tech-work", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const work = await floorExecutionEngine.getTechnicianWork(requireAuthenticatedUser(req).id);
    res.json({ success: true, data: work });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/timer/start
 */
floorExecutionRouter.post("/timer/start", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const { executionId } = req.body;
    const result = await floorExecutionEngine.startRepairTimer(executionId, requireAuthenticatedUser(req).id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/timer/pause
 */
floorExecutionRouter.post("/timer/pause", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const { executionId, pauseReason } = req.body;
    const result = await floorExecutionEngine.pauseRepairTimer(executionId, requireAuthenticatedUser(req).id, pauseReason);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/timer/resume
 */
floorExecutionRouter.post("/timer/resume", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const { executionId } = req.body;
    const result = await floorExecutionEngine.resumeRepairTimer(executionId, requireAuthenticatedUser(req).id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/parts-request
 */
floorExecutionRouter.post("/parts-request", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const { jobCardId, vrn, operationId, partDescription, quantity, urgency } = req.body;
    const user = requireAuthenticatedUser(req);

    const result = await floorExecutionEngine.raisePartsRequest(
      jobCardId,
      vrn,
      operationId,
      partDescription,
      quantity,
      urgency,
      user.name,
      user.branchId
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/floor-execution/parts-status/:jobCardId
 * The technician's own view of parts they've requested for this job —
 * requested_at/acknowledged_at/fulfilled_at are what make the workshop's
 * 15-minute query/issue TAT reporting possible.
 */
floorExecutionRouter.get("/parts-status/:jobCardId", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const requests = await floorExecutionEngine.getPartsRequestsForJob(req.params.jobCardId);
    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/warranty-review
 */
floorExecutionRouter.post("/warranty-review", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const { jobCardId, vrn, vin, complaint, diagnosis, failedPart } = req.body;
    const user = requireAuthenticatedUser(req);

    const result = await floorExecutionEngine.raiseWarrantyReview(
      jobCardId,
      vrn,
      vin,
      complaint,
      diagnosis,
      failedPart,
      user.name,
      user.branchId
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/additional-finding
 */
floorExecutionRouter.post("/additional-finding", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const { jobCardId, vrn, findingText, recommendedWork, requiredPart, estimatedAdditionalMins, requiresCustomerApproval } = req.body;
    const user = requireAuthenticatedUser(req);

    const result = await floorExecutionEngine.raiseAdditionalFinding(
      jobCardId,
      vrn,
      findingText,
      recommendedWork,
      requiredPart,
      estimatedAdditionalMins,
      requiresCustomerApproval,
      user.name,
      user.branchId
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/eta-extension/request
 */
floorExecutionRouter.post("/eta-extension/request", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const { jobCardId, oldEta, newEta, reason, extensionCount } = req.body;
    const user = requireAuthenticatedUser(req);

    const result = await floorExecutionEngine.requestEtaExtension(
      jobCardId,
      oldEta,
      newEta,
      reason,
      user.name,
      extensionCount,
      user.branchId
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/eta-extension/approve
 */
floorExecutionRouter.post("/eta-extension/approve", authenticateJwt, requireFloorRoles(FLOOR_CONTROL_ROLES), async (req: Request, res: Response) => {
  try {
    const { extensionId } = req.body;
    const user = requireAuthenticatedUser(req);
    const result = await floorExecutionEngine.approveEtaExtension(extensionId, user.id, user.role);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(403).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/floor-execution/delays
 */
floorExecutionRouter.get("/delays", authenticateJwt, requireFloorRoles(FLOOR_CONTROL_ROLES), async (req: Request, res: Response) => {
  try {
    const delays = await floorExecutionEngine.getFloorDelaysQueue(requireAuthenticatedUser(req).branchId);
    res.json({ success: true, data: delays });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/tech-complete
 */
floorExecutionRouter.post("/tech-complete", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const { executionId } = req.body;
    const result = await floorExecutionEngine.completeTechnicianJob(executionId, requireAuthenticatedUser(req).id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/qc-handoff
 * The technician who did the work marks it QC-ready — not only a floor
 * supervisor/manager — per the workshop's own flow ("technician marks the
 * job status to QC inspection"). Previously gated to FLOOR_CONTROL_ROLES
 * only, so a technician calling this got a 403.
 */
floorExecutionRouter.post("/qc-handoff", authenticateJwt, requireFloorRoles(FLOOR_EXECUTION_ROLES), async (req: Request, res: Response) => {
  try {
    const { jobCardId, vrn, qcInchargeId } = req.body;
    const user = requireAuthenticatedUser(req);

    const result = await floorExecutionEngine.handoffToQc(jobCardId, vrn, user.id, qcInchargeId, user.branchId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
