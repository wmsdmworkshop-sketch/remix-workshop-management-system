/**
 * Billing Routes — Phase 8: CRM Billing Evidence & Manual Gate Pass Governance
 * AIVAAHAN-ROLE-OPS-IMPL-008 — Revision 2
 *
 * SECURITY CONTRACT:
 *   branchId ALWAYS from authenticated JWT — never from client body.
 *   Role checks for SM/WM/GM endpoints are enforced SERVER-SIDE in BillingEngine
 *   by querying users.role — not from JWT role claim alone.
 *   Cross-branch IDOR: BillingEngine throws BILLING_BRANCH_MISMATCH / MGP_BRANCH_MISMATCH.
 */
import { Router, Request, Response } from "express";
import { authenticateJwt, authorize } from "../middleware/auth.ts";
import { BillingEngine } from "../../core/workshop/billing-engine.ts";

const router = Router();
const engine = BillingEngine.getInstance();

// AUDIT: same defect as qc.routes.ts. The SECURITY CONTRACT above depends on
// branchId coming from the JWT, but this router never ran authenticateJwt —
// it inherited server.ts's global authenticateToken, which produces user_id /
// workshop_id and no branchId. resolveAuthBranchId() therefore threw
// BRANCH_CONTEXT_MISSING and httpStatus() mapped it to 401, so every Phase-8
// billing route was answering 401 rather than enforcing anything. Worse, had
// any path populated branchId partially, checkBranchAccess() returns true when
// a branch id is absent — so the cross-branch guarantee in the contract above
// was inert either way. authenticateJwt supplies id / roleId / branchId
// (mapping workshop_id) so both the permission check and the branch check
// operate on real values.
router.use(authenticateJwt);

/**
 * Single-branch default — same reasoning as qc.routes.ts.
 *
 * This threw BRANCH_CONTEXT_MISSING (mapped to 401 by httpStatus below) for
 * every user, because the `workshops` table is empty so no JWT can carry a
 * branchId. Combined with the missing authenticateJwt fixed earlier, it is why
 * the entire Phase-8 billing lane has never been reachable.
 *
 * 1 is the real branch: tbl_pre_invoice.branch_id is `int` and contains 1.
 *
 * REVISIT WHEN A SECOND BRANCH EXISTS: this default must be removed, or billing
 * actions could be attributed to the wrong branch. Note the cross-branch guard
 * in BillingEngine (BILLING_BRANCH_MISMATCH) compares against this value, so it
 * still functions — it simply has one branch to compare against today.
 */
const DEFAULT_BRANCH_ID = 1;

function resolveAuthBranchId(user: any): number {
  const bid = user.branchId;
  if (bid === undefined || bid === null) {
    return DEFAULT_BRANCH_ID;
  }
  return Number(bid);
}

function resolveAuthUserId(user: any): number {
  const uid = user.userId ?? user.id ?? user.user_id;
  if (!uid) throw new Error("USER_CONTEXT_MISSING: Authenticated user has no userId claim.");
  return Number(uid);
}

function httpStatus(errorMessage: string): number {
  if (errorMessage?.includes("BRANCH_CONTEXT_MISSING") || errorMessage?.includes("USER_CONTEXT_MISSING")) return 401;
  if (errorMessage?.includes("MISMATCH") || errorMessage?.includes("FORBIDDEN") || errorMessage?.includes("GM_ROLE_REQUIRED") || errorMessage?.includes("ROLE_FORBIDDEN")) return 403;
  if (errorMessage?.includes("NOT_FOUND")) return 404;
  if (errorMessage?.includes("INVALID_STATE") || errorMessage?.includes("DUPLICATE") || errorMessage?.includes("VARIANCE") || errorMessage?.includes("REQUIRED") || errorMessage?.includes("CONFIRM") || errorMessage?.includes("READINESS_FAILED")) return 422;
  return 500;
}

// ─── SA WORKSPACE ─────────────────────────────────────────────────────────────

// GET /api/billing/ready-from-qc — SA: MY READY FROM QC
router.get("/ready-from-qc", authorize("billing", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const data = await engine.getReadyFromQcQueue(resolveAuthBranchId(user), user.name ?? user.full_name ?? "");
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// GET /api/billing/my-pre-invoices — SA: MY PRE-INVOICES
router.get("/my-pre-invoices", authorize("billing", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const data = await engine.getMyPreInvoices(resolveAuthBranchId(user), resolveAuthUserId(user));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// GET /api/billing/my-returns — SA: MY BILLING RETURNS
router.get("/my-returns", authorize("billing", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const data = await engine.getMyBillingReturns(resolveAuthBranchId(user), resolveAuthUserId(user));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/pre-invoice/check-readiness/:jobId
router.post("/pre-invoice/check-readiness/:jobId", authorize("billing", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });
    const result = await engine.checkPhase8Readiness(jobId, resolveAuthBranchId(user), resolveAuthUserId(user), user.name ?? user.full_name ?? "");
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/pre-invoice/compile/:jobId
router.post("/pre-invoice/compile/:jobId", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });
    const { requestedDiscount } = req.body;
    const result = await engine.compilePreInvoice(
      jobId, resolveAuthBranchId(user), resolveAuthUserId(user),
      user.name ?? user.full_name ?? "SA", Number(requestedDiscount ?? 0)
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/pre-invoice/review/:preInvoiceId
router.post("/pre-invoice/review/:preInvoiceId", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const piId = parseInt(req.params.preInvoiceId);
    if (isNaN(piId)) return res.status(400).json({ success: false, error: "Invalid preInvoiceId" });
    await engine.saReviewPreInvoice(piId, resolveAuthBranchId(user), resolveAuthUserId(user));
    res.json({ success: true, message: "Pre-invoice SA reviewed" });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/pre-invoice/send-to-customer/:preInvoiceId
router.post("/pre-invoice/send-to-customer/:preInvoiceId", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const piId = parseInt(req.params.preInvoiceId);
    if (isNaN(piId)) return res.status(400).json({ success: false, error: "Invalid preInvoiceId" });
    await engine.sendToCustomer(piId, resolveAuthBranchId(user), resolveAuthUserId(user));
    res.json({ success: true, message: "Pre-invoice sent to customer" });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/pre-invoice/capture-confirmation/:preInvoiceId
router.post("/pre-invoice/capture-confirmation/:preInvoiceId", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const piId = parseInt(req.params.preInvoiceId);
    if (isNaN(piId)) return res.status(400).json({ success: false, error: "Invalid preInvoiceId" });
    const result = await engine.captureCustomerConfirmation(
      piId, resolveAuthBranchId(user), resolveAuthUserId(user),
      user.name ?? user.full_name ?? "SA", req.body
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/pre-invoice/recompile/:preInvoiceId
router.post("/pre-invoice/recompile/:preInvoiceId", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const piId = parseInt(req.params.preInvoiceId);
    if (isNaN(piId)) return res.status(400).json({ success: false, error: "Invalid preInvoiceId" });
    const { requestedDiscount, changeReason } = req.body;
    const result = await engine.recompileVersion(
      piId, resolveAuthBranchId(user), resolveAuthUserId(user),
      user.name ?? user.full_name ?? "SA",
      Number(requestedDiscount ?? 0), changeReason ?? "SA correction"
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/handoff/:preInvoiceId
router.post("/handoff/:preInvoiceId", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const piId = parseInt(req.params.preInvoiceId);
    if (isNaN(piId)) return res.status(400).json({ success: false, error: "Invalid preInvoiceId" });
    await engine.handoffToBilling(piId, resolveAuthBranchId(user), resolveAuthUserId(user), user.name ?? "SA");
    res.json({ success: true, message: "Handed off to Billing" });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// ─── BILLING OFFICER WORKSPACE ────────────────────────────────────────────────

// GET /api/billing/my-queue
router.get("/my-queue", authorize("billing", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const data = await engine.getBillingQueue(resolveAuthBranchId(user));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/acknowledge/:preInvoiceId
router.post("/acknowledge/:preInvoiceId", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const piId = parseInt(req.params.preInvoiceId);
    if (isNaN(piId)) return res.status(400).json({ success: false, error: "Invalid preInvoiceId" });
    await engine.billingAcknowledge(piId, resolveAuthBranchId(user), resolveAuthUserId(user), user.name ?? "Billing");
    res.json({ success: true, message: "Billing acknowledged" });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/validate/:preInvoiceId
router.post("/validate/:preInvoiceId", authorize("billing", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const piId = parseInt(req.params.preInvoiceId);
    if (isNaN(piId)) return res.status(400).json({ success: false, error: "Invalid preInvoiceId" });
    const result = await engine.billingValidate(piId, resolveAuthBranchId(user));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/return-to-sa/:preInvoiceId
router.post("/return-to-sa/:preInvoiceId", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const piId = parseInt(req.params.preInvoiceId);
    if (isNaN(piId)) return res.status(400).json({ success: false, error: "Invalid preInvoiceId" });
    const { reasonCode, remarks } = req.body;
    await engine.returnToSA(piId, resolveAuthBranchId(user), resolveAuthUserId(user), user.name ?? "Billing", reasonCode, remarks);
    res.json({ success: true, message: "Returned to SA" });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/crm-invoice/:preInvoiceId — NORMAL BILLING COMPLETION
router.post("/crm-invoice/:preInvoiceId", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const piId = parseInt(req.params.preInvoiceId);
    if (isNaN(piId)) return res.status(400).json({ success: false, error: "Invalid preInvoiceId" });
    const result = await engine.captureCrmInvoice(
      piId, resolveAuthBranchId(user), resolveAuthUserId(user),
      user.name ?? user.full_name ?? "Billing", req.body
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// GET /api/billing/pending-red-alerts — Billing/SM/WM/GM
router.get("/pending-red-alerts", authorize("billing", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const data = await engine.getBillingPendingRedAlerts(resolveAuthBranchId(user));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// ─── MANUAL GATE PASS — SM/WM RAISE ──────────────────────────────────────────

// POST /api/billing/manual-gate-pass/raise
// Role check is performed SERVER-SIDE inside engine.raiseManualGatePassRequest()
// by querying users.role — NOT from JWT claim alone.
router.post("/manual-gate-pass/raise", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { jobId, ...payload } = req.body;
    if (!jobId) return res.status(400).json({ success: false, error: "jobId required" });
    const result = await engine.raiseManualGatePassRequest(
      Number(jobId), resolveAuthBranchId(user), resolveAuthUserId(user),
      user.name ?? user.full_name ?? "Requestor", payload
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// GET /api/billing/manual-gate-pass/pending-gm
router.get("/manual-gate-pass/pending-gm", authorize("billing", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const data = await engine.getManualGatePassPendingGm(resolveAuthBranchId(user));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/manual-gate-pass/:mgpId/gm-action
// GM role enforced SERVER-SIDE in engine.gmApproveManualGatePass() via users.role query.
router.post("/manual-gate-pass/:mgpId/gm-action", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const mgpId = parseInt(req.params.mgpId);
    if (isNaN(mgpId)) return res.status(400).json({ success: false, error: "Invalid mgpId" });
    const { action, remarks } = req.body;
    if (!["APPROVE", "REJECT", "RETURN_FOR_CLARIFICATION"].includes(action)) {
      return res.status(400).json({ success: false, error: "action must be APPROVE, REJECT, or RETURN_FOR_CLARIFICATION" });
    }
    const result = await engine.gmApproveManualGatePass(
      mgpId, resolveAuthBranchId(user), resolveAuthUserId(user), action, remarks ?? ""
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// POST /api/billing/manual-gate-pass/:mgpId/reconcile-crm
router.post("/manual-gate-pass/:mgpId/reconcile-crm", authorize("billing", "edit"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const mgpId = parseInt(req.params.mgpId);
    if (isNaN(mgpId)) return res.status(400).json({ success: false, error: "Invalid mgpId" });
    const { preInvoiceId, ...payload } = req.body;
    const result = await engine.reconcileCrmInvoiceLater(
      mgpId, Number(preInvoiceId ?? 0), resolveAuthBranchId(user),
      resolveAuthUserId(user), user.name ?? user.full_name ?? "Billing", payload
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// GET /api/billing/exceptions — SM/WM/GM/DP billing exception dashboard
router.get("/exceptions", authorize("billing", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const data = await engine.getBillingPendingRedAlerts(resolveAuthBranchId(user));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// GET /api/billing/pre-invoice/:preInvoiceId
router.get("/pre-invoice/:preInvoiceId", authorize("billing", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const piId = parseInt(req.params.preInvoiceId);
    if (isNaN(piId)) return res.status(400).json({ success: false, error: "Invalid preInvoiceId" });
    const branchId = resolveAuthBranchId(user);

    const [rows]: any = await (await import("../../db/index.ts")).pool.execute(
      `SELECT pi.*, piv.labour_total, piv.parts_total, piv.grand_total, piv.gst_rate, piv.discount_status,
              piv.authorized_discount, piv.cgst, piv.sgst, piv.is_locked, piv.version
       FROM tbl_pre_invoice pi
       JOIN tbl_pre_invoice_version piv ON piv.pre_invoice_id = pi.pre_invoice_id AND piv.version = pi.current_version
       WHERE pi.pre_invoice_id = ? AND pi.branch_id = ?`,
      [piId, branchId]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, error: "Pre-invoice not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

// GET /api/billing/crm-evidence/:jobId
router.get("/crm-evidence/:jobId", authorize("billing", "view"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ success: false, error: "Invalid jobId" });
    const branchId = resolveAuthBranchId(user);

    const [rows]: any = await (await import("../../db/index.ts")).pool.execute(
      `SELECT * FROM tbl_crm_billing_evidence WHERE job_id = ? AND branch_id = ? ORDER BY created_at DESC`,
      [jobId, branchId]
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(httpStatus(err.message)).json({ success: false, error: err.message });
  }
});

export default router;
export const billingRouter = router;
