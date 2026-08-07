import { Router, Request, Response } from "express";
import { floorExecutionEngine } from "../../core/workshop/floor-execution-engine";

export const floorExecutionRouter = Router();

/**
 * GET /api/floor-execution/new-jobs
 */
floorExecutionRouter.get("/new-jobs", async (req: Request, res: Response) => {
  try {
    const floorId = (req as any).user?.userId || (req as any).user?.id || "FLOOR-01";
    const branchId = (req as any).user?.branchId || "BR-SEDAM";
    const queue = await floorExecutionEngine.getFloorPendingQueue(floorId, branchId);
    res.json({ success: true, count: queue.length, data: queue });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/acknowledge-handoff
 */
floorExecutionRouter.post("/acknowledge-handoff", async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.body;
    const floorId = (req as any).user?.userId || (req as any).user?.id || "FLOOR-01";
    const floorName = (req as any).user?.fullName || "Floor Supervisor";
    const result = await floorExecutionEngine.acknowledgeFloorHandoff(jobCardId, floorId, floorName);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/floor-execution/bays
 */
floorExecutionRouter.get("/bays", async (req: Request, res: Response) => {
  try {
    const branchId = (req as any).user?.branchId || "BR-SEDAM";
    const bays = await floorExecutionEngine.getBaysStatus(branchId);
    res.json({ success: true, data: bays });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/floor-execution/technicians
 */
floorExecutionRouter.get("/technicians", async (req: Request, res: Response) => {
  try {
    const branchId = (req as any).user?.branchId || "BR-SEDAM";
    const techs = await floorExecutionEngine.getTechniciansRoster(branchId);
    res.json({ success: true, data: techs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/recommend-allocation
 */
floorExecutionRouter.post("/recommend-allocation", async (req: Request, res: Response) => {
  try {
    const { jobCardId } = req.body;
    const branchId = (req as any).user?.branchId || "BR-SEDAM";
    const suggestion = await floorExecutionEngine.generateBayTechRecommendation(jobCardId, branchId);
    res.json({ success: true, data: suggestion });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/allocate
 */
floorExecutionRouter.post("/allocate", async (req: Request, res: Response) => {
  try {
    const { jobCardId, bayId, technicianId, technicianName, isOverride, overrideReason } = req.body;
    const allocatedBy = (req as any).user?.fullName || "Floor Supervisor";
    const branchId = (req as any).user?.branchId || "BR-SEDAM";

    const allocation = await floorExecutionEngine.allocateJobAndBay(
      jobCardId,
      bayId,
      technicianId,
      technicianName,
      allocatedBy,
      isOverride,
      overrideReason,
      branchId
    );
    res.json({ success: true, data: allocation });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/floor-execution/tech-work
 */
floorExecutionRouter.get("/tech-work", async (req: Request, res: Response) => {
  try {
    const technicianId = (req as any).user?.userId || (req as any).user?.id || "TECH-001";
    const work = await floorExecutionEngine.getTechnicianWork(technicianId);
    res.json({ success: true, data: work });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/timer/start
 */
floorExecutionRouter.post("/timer/start", async (req: Request, res: Response) => {
  try {
    const { executionId } = req.body;
    const technicianId = (req as any).user?.userId || (req as any).user?.id || "TECH-001";
    const result = await floorExecutionEngine.startRepairTimer(executionId, technicianId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/timer/pause
 */
floorExecutionRouter.post("/timer/pause", async (req: Request, res: Response) => {
  try {
    const { executionId, pauseReason } = req.body;
    const technicianId = (req as any).user?.userId || (req as any).user?.id || "TECH-001";
    const result = await floorExecutionEngine.pauseRepairTimer(executionId, technicianId, pauseReason);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/timer/resume
 */
floorExecutionRouter.post("/timer/resume", async (req: Request, res: Response) => {
  try {
    const { executionId } = req.body;
    const technicianId = (req as any).user?.userId || (req as any).user?.id || "TECH-001";
    const result = await floorExecutionEngine.resumeRepairTimer(executionId, technicianId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/parts-request
 */
floorExecutionRouter.post("/parts-request", async (req: Request, res: Response) => {
  try {
    const { jobCardId, vrn, operationId, partDescription, quantity, urgency } = req.body;
    const requestedBy = (req as any).user?.fullName || "Floor User";
    const branchId = (req as any).user?.branchId || "BR-SEDAM";

    const result = await floorExecutionEngine.raisePartsRequest(
      jobCardId,
      vrn,
      operationId,
      partDescription,
      quantity,
      urgency,
      requestedBy,
      branchId
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/warranty-review
 */
floorExecutionRouter.post("/warranty-review", async (req: Request, res: Response) => {
  try {
    const { jobCardId, vrn, vin, complaint, diagnosis, failedPart } = req.body;
    const requestedBy = (req as any).user?.fullName || "Floor User";
    const branchId = (req as any).user?.branchId || "BR-SEDAM";

    const result = await floorExecutionEngine.raiseWarrantyReview(
      jobCardId,
      vrn,
      vin,
      complaint,
      diagnosis,
      failedPart,
      requestedBy,
      branchId
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/additional-finding
 */
floorExecutionRouter.post("/additional-finding", async (req: Request, res: Response) => {
  try {
    const { jobCardId, vrn, findingText, recommendedWork, requiredPart, estimatedAdditionalMins, requiresCustomerApproval } = req.body;
    const identifiedBy = (req as any).user?.fullName || "Floor User";
    const branchId = (req as any).user?.branchId || "BR-SEDAM";

    const result = await floorExecutionEngine.raiseAdditionalFinding(
      jobCardId,
      vrn,
      findingText,
      recommendedWork,
      requiredPart,
      estimatedAdditionalMins,
      requiresCustomerApproval,
      identifiedBy,
      branchId
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/eta-extension/request
 */
floorExecutionRouter.post("/eta-extension/request", async (req: Request, res: Response) => {
  try {
    const { jobCardId, oldEta, newEta, reason, extensionCount } = req.body;
    const requestedBy = (req as any).user?.fullName || "Floor User";
    const branchId = (req as any).user?.branchId || "BR-SEDAM";

    const result = await floorExecutionEngine.requestEtaExtension(
      jobCardId,
      oldEta,
      newEta,
      reason,
      requestedBy,
      extensionCount,
      branchId
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/eta-extension/approve
 */
floorExecutionRouter.post("/eta-extension/approve", async (req: Request, res: Response) => {
  try {
    const { extensionId } = req.body;
    const approverId = (req as any).user?.userId || (req as any).user?.id || "MGR-01";
    const approverRole = (req as any).user?.role || "service_manager";

    const result = await floorExecutionEngine.approveEtaExtension(extensionId, approverId, approverRole);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(403).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/floor-execution/delays
 */
floorExecutionRouter.get("/delays", async (req: Request, res: Response) => {
  try {
    const branchId = (req as any).user?.branchId || "BR-SEDAM";
    const delays = await floorExecutionEngine.getFloorDelaysQueue(branchId);
    res.json({ success: true, data: delays });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/tech-complete
 */
floorExecutionRouter.post("/tech-complete", async (req: Request, res: Response) => {
  try {
    const { executionId } = req.body;
    const technicianId = (req as any).user?.userId || (req as any).user?.id || "TECH-001";
    const result = await floorExecutionEngine.completeTechnicianJob(executionId, technicianId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/floor-execution/qc-handoff
 */
floorExecutionRouter.post("/qc-handoff", async (req: Request, res: Response) => {
  try {
    const { jobCardId, vrn, qcInchargeId } = req.body;
    const floorInchargeId = (req as any).user?.userId || (req as any).user?.id || "FLOOR-01";
    const branchId = (req as any).user?.branchId || "BR-SEDAM";

    const result = await floorExecutionEngine.handoffToQc(jobCardId, vrn, floorInchargeId, qcInchargeId, branchId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
