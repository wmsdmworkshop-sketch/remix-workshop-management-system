import { Router } from "express";
import { authorize } from "../middleware/auth.ts";
import { PartsWarrantyEngine } from "../../core/workshop/parts-warranty-engine.ts";

export const partsRouter = Router();

partsRouter.get("/my-queue", authorize("spares", "view"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const branchId = req.user.branchId || "BR-SEDAM";
    const queue = await engine.getPartsQueue(String(branchId));
    res.json({ success: true, queue });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

partsRouter.get("/stock-check/:partCode", authorize("spares", "view"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const branchId = req.user.branchId || "BR-SEDAM";
    const stock = await engine.checkStockAvailability(req.params.partCode, String(branchId));
    res.json({ success: true, stock });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

partsRouter.post("/acknowledge", authorize("spares", "edit"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const branchId = req.user.branchId ? String(req.user.branchId) : undefined;
    const result = await engine.acknowledgePartsRequest(
      req.body.requestId,
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

partsRouter.post("/fulfill", authorize("spares", "edit"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const branchId = req.user.branchId ? String(req.user.branchId) : undefined;
    const result = await engine.fulfillPartsRequest(
      req.body.requestId,
      String(req.user.id),
      req.user.full_name || req.user.username,
      req.body.warehouseId || 'WH-MAIN',
      req.body.binId || 'BIN-01',
      branchId
    );
    res.json(result);
  } catch (err: any) {
    const status = err.message?.includes("IDOR_DENIED") ? 403 :
                   err.message?.includes("DUPLICATE_FULFILLMENT") ? 409 :
                   err.message?.includes("INSUFFICIENT_STOCK") ? 422 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

partsRouter.post("/backorder", authorize("spares", "edit"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const branchId = req.user.branchId ? String(req.user.branchId) : undefined;
    const result = await engine.backorderPartsRequest(
      req.body.requestId,
      String(req.user.id),
      req.user.full_name || req.user.username,
      req.body.expectedDate,
      branchId
    );
    res.json(result);
  } catch (err: any) {
    const status = err.message?.includes("IDOR_DENIED") ? 403 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

partsRouter.post("/reject", authorize("spares", "edit"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const branchId = req.user.branchId ? String(req.user.branchId) : undefined;
    const result = await engine.rejectPartsRequest(
      req.body.requestId,
      String(req.user.id),
      req.user.full_name || req.user.username,
      req.body.reason,
      branchId
    );
    res.json(result);
  } catch (err: any) {
    const status = err.message?.includes("IDOR_DENIED") ? 403 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

partsRouter.get("/my-fulfilled-today", authorize("spares", "view"), async (req: any, res) => {
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const branchId = req.user.branchId || "BR-SEDAM";
    const fulfilled = await engine.getMyFulfilledToday(String(branchId), req.user.full_name || req.user.username);
    res.json({ success: true, fulfilled });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
