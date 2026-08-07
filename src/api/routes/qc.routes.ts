/**
 * QC Routes — Phase 7 (Blocker Closeout)
 * Branch isolation: branchId MUST come from authenticated JWT.
 * branchId || 1 fallback is NOT permitted — missing branchId → 401.
 */
import { Router, Request, Response } from "express";
import { authorize } from "../middleware/auth.ts";
import { QcExecutionEngine } from "../../core/workshop/qc-execution-engine.ts";

const router = Router();
const engine = QcExecutionEngine.getInstance();

function resolveAuthBranchId(user: any): number {
  const bid = user.branchId;
  if (bid === undefined || bid === null) {
    throw new Error("BRANCH_CONTEXT_MISSING: Authenticated user has no branchId claim. Re-authenticate.");
  }
  return Number(bid);
}

function resolveAuthUserId(user: any): number {
  const uid = user.userId ?? user.id ?? user.user_id;
  if (!uid) throw new Error("USER_CONTEXT_MISSING: Authenticated user has no userId claim.");
  return Number(uid);
}

// POST /api/qc/acknowledge/:jobId
router.post("/acknowledge/:jobId", authorize("qc", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });
    await engine.acknowledgeQcHandoff(jobId, resolveAuthUserId(user), resolveAuthBranchId(user));
    res.json({ success: true, message: "QC Handoff Acknowledged" });
  } catch (error: any) {
    const status = error.message?.includes("BRANCH_CONTEXT_MISSING") ? 401 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// GET /api/qc/checklist/:jobId
router.get("/checklist/:jobId", authorize("qc", "view"), async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });
    const checklist = await engine.generateContextualChecklist(jobId);
    res.json({ success: true, data: checklist });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/qc/decision/:jobId
router.post("/decision/:jobId", authorize("qc", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });
    const body = req.body;
    if (!["PASS", "FAIL"].includes(body.decision)) {
      return res.status(400).json({ success: false, error: "decision must be PASS or FAIL" });
    }
    await engine.submitQcDecision(jobId, resolveAuthUserId(user), resolveAuthBranchId(user), body.decision, body.checklist || [], body.roadTestKm || 0, body.notes || "");
    res.json({ success: true, message: `QC Decision ${body.decision} Submitted` });
  } catch (error: any) {
    const status = error.message?.startsWith("QC_PASS_BLOCKED") ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// POST /api/qc/rework/complete/:jobId
router.post("/rework/complete/:jobId", authorize("floor", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });
    await engine.completeRework(jobId, resolveAuthUserId(user), resolveAuthBranchId(user), req.body.techId, req.body.notes);
    res.json({ success: true, message: "Rework Completed, Job returned to QC Queue" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/qc/sa-acknowledge/:jobId
router.post("/sa-acknowledge/:jobId", authorize("service_advisor", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });
    await engine.saAcknowledgeQc(jobId, resolveAuthUserId(user), resolveAuthBranchId(user));
    res.json({ success: true, message: "Service Advisor Acknowledged QC — Pre-Invoice Ready" });
  } catch (error: any) {
    const status = error.message?.startsWith("SA_ACK_BLOCKED") ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// GET /api/qc/pre-invoice-readiness/:jobId
router.get("/pre-invoice-readiness/:jobId", authorize("service_advisor", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });
    const readiness = await engine.checkPreInvoiceReadiness(jobId, resolveAuthBranchId(user));
    res.json({ success: true, data: readiness });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── ROAD TEST ROUTES ────────────────────────────────────────────────────────

// POST /api/qc/road-test/set-requirement/:jobId — QC In-Charge sets REQUIRED or NOT_REQUIRED
router.post("/road-test/set-requirement/:jobId", authorize("qc", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });
    const { decision } = req.body;
    if (!["REQUIRED", "NOT_REQUIRED"].includes(decision)) {
      return res.status(400).json({ success: false, error: "decision must be REQUIRED or NOT_REQUIRED" });
    }
    const branchId = resolveAuthBranchId(user);
    const userId = resolveAuthUserId(user);
    const result = await engine.setRoadTestRequirement(jobId, branchId, decision, userId, user.fullName || user.username || "QC Inspector");
    res.json({ success: true, roadTestId: result.roadTestId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/qc/road-test/start/:roadTestId — Start road test (captures tester + odometer)
router.post("/road-test/start/:roadTestId", authorize("qc", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const roadTestId = parseInt(req.params.roadTestId);
    if (isNaN(roadTestId)) return res.status(400).json({ success: false, error: "Invalid roadTestId" });
    const { jobId, startOdometer } = req.body;
    if (!jobId || startOdometer === undefined) {
      return res.status(400).json({ success: false, error: "jobId and startOdometer required" });
    }
    const branchId = resolveAuthBranchId(user);
    const userId = resolveAuthUserId(user);
    await engine.startRoadTest(roadTestId, Number(jobId), branchId, userId, user.fullName || user.username || "Tester", Number(startOdometer));
    res.json({ success: true, message: "Road test started" });
  } catch (error: any) {
    const status = error.message?.startsWith("RT_INVALID_TRANSITION") ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// POST /api/qc/road-test/complete/:roadTestId — Complete with PASSED or FAILED
router.post("/road-test/complete/:roadTestId", authorize("qc", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const roadTestId = parseInt(req.params.roadTestId);
    if (isNaN(roadTestId)) return res.status(400).json({ success: false, error: "Invalid roadTestId" });
    const { jobId, result, endOdometer, remarks } = req.body;
    if (!jobId || !result || endOdometer === undefined) {
      return res.status(400).json({ success: false, error: "jobId, result and endOdometer required" });
    }
    if (!["PASSED", "FAILED"].includes(result)) {
      return res.status(400).json({ success: false, error: "result must be PASSED or FAILED" });
    }
    const branchId = resolveAuthBranchId(user);
    await engine.completeRoadTest(roadTestId, Number(jobId), branchId, result, Number(endOdometer), remarks || "");
    res.json({ success: true, message: `Road test ${result}` });
  } catch (error: any) {
    const status = error.message?.startsWith("RT_") ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// GET /api/qc/road-test/history/:jobId
router.get("/road-test/history/:jobId", authorize("qc", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });
    const history = await engine.getRoadTestHistory(jobId, resolveAuthBranchId(user));
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export const qcRoutes = router;
