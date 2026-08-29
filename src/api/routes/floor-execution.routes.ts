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

function requireAuthenticatedUser(req: any): { id: string; name: string; branchId: string; role: string } {
  const user = req.user;
  if (!user?.id || user.branchId === undefined || user.branchId === null) {
    throw new Error("AUTHENTICATED_USER_CONTEXT_REQUIRED");
  }
  return {
    id: String(user.id ?? user.userId ?? user.user_id),
    name: user.full_name || user.fullName || user.username || String(user.id),
    branchId: String(user.branchId),
    role: normaliseRole(user.role),
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
 */
floorExecutionRouter.post("/qc-handoff", authenticateJwt, requireFloorRoles(FLOOR_CONTROL_ROLES), async (req: Request, res: Response) => {
  try {
    const { jobCardId, vrn, qcInchargeId } = req.body;
    const user = requireAuthenticatedUser(req);

    const result = await floorExecutionEngine.handoffToQc(jobCardId, vrn, user.id, qcInchargeId, user.branchId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
