import { Router } from "express";
import { authorize } from "../middleware/auth.ts";
import { PartsWarrantyEngine } from "../../core/workshop/parts-warranty-engine.ts";

export const warrantyRouter = Router();

warrantyRouter.get("/my-queue", authorize("warranty", "view"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const branchId = req.user.branchId || "BR-SEDAM";
    const queue = await engine.getWarrantyQueue(String(branchId));
    res.json({ success: true, queue });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

warrantyRouter.get("/eligibility-check/:reviewId", authorize("warranty", "view"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const result = await engine.checkWarrantyEligibility(req.params.reviewId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

warrantyRouter.get("/document-gaps/:reviewId", authorize("warranty", "view"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const result = await engine.detectDocumentGaps(req.params.reviewId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

warrantyRouter.post("/acknowledge", authorize("warranty", "edit"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const branchId = req.user.branchId ? String(req.user.branchId) : undefined;
    const result = await engine.acknowledgeWarrantyReview(
      req.body.reviewId,
      String(req.user.id),
      req.user.full_name || req.user.username,
      branchId
    );
    res.json(result);
  } catch (err: any) {
    const status = err.message?.includes("IDOR_DENIED") ? 403 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

warrantyRouter.post("/adjudicate", authorize("warranty", "edit"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const branchId = req.user.branchId ? String(req.user.branchId) : undefined;
    const result = await engine.adjudicateWarrantyReview(
      req.body.reviewId,
      req.body.decision,
      String(req.user.id),
      req.user.full_name || req.user.username,
      req.body.notes,
      branchId
    );
    res.json(result);
  } catch (err: any) {
    const status = err.message?.includes("IDOR_DENIED") ? 403 :
                   err.message?.includes("DUPLICATE_ADJUDICATION") ? 409 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

warrantyRouter.get("/my-adjudicated-today", authorize("warranty", "view"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const branchId = req.user.branchId || "BR-SEDAM";
    const adjudicated = await engine.getMyAdjudicatedToday(String(branchId), req.user.full_name || req.user.username);
    res.json({ success: true, adjudicated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
