import { Router, Request, Response } from "express";
import { authenticateJwt } from "../middleware/auth";
import { GateOutEngine } from "../../core/workshop/gate-out-engine";

const router = Router();
const gateOutEngine = new GateOutEngine();

// Helper to extract branchId, default to 1 if missing for testing fallback
const getBranchId = (req: Request) => req.user?.branchId || 1;

router.get("/cashier-queue", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const queue = await gateOutEngine.getCashierQueue(getBranchId(req));
    res.json(queue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/record-payment", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const cashierId = String(req.user?.id || 1);
    const { jobId, amount, paymentMode, referenceNumber } = req.body;
    
    if (!jobId || !amount || !paymentMode) {
      return res.status(400).json({ error: "Missing required payment fields." });
    }

    const result = await gateOutEngine.recordPayment({
      jobId, branchId: getBranchId(req), amount, paymentMode, referenceNumber, cashierId
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/request-credit", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const requestedBy = String(req.user?.id || 1);
    const { jobId, reason, amount } = req.body;
    
    if (!jobId || !reason) {
      return res.status(400).json({ error: "Missing required credit fields." });
    }

    const result = await gateOutEngine.raiseCreditRequest({
      jobId, branchId: getBranchId(req), reason, amount, requestedBy
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/decide-credit", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const gmId = String(req.user?.id || 1);
    const role = req.user?.role?.toUpperCase() || "GM";

    if (role !== "GM" && role !== "DEALER_PRINCIPAL") {
      return res.status(403).json({ error: "CREDIT_GM_APPROVAL_REQUIRED: Only GM can approve credit." });
    }

    const { creditRequestId, decision } = req.body;
    if (!creditRequestId || !decision) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const result = await gateOutEngine.decideCreditRequest({
      creditRequestId, gmId, decision, branchId: getBranchId(req)
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/create-gate-pass", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const issuedBy = String(req.user?.id || 1);
    const { jobId } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: "Missing jobId." });
    }

    const result = await gateOutEngine.createGatePass({
      jobId, branchId: getBranchId(req), issuedBy
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/security-queue", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const queue = await gateOutEngine.getSecurityExitQueue(getBranchId(req));
    res.json(queue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/gate-out", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const securityOperatorId = String(req.user?.id || 1);
    const { gatePassId, jobId, captureSource, expectedVrn, detectedVrn, evidenceId } = req.body;
    
    if (!gatePassId || !jobId || !expectedVrn || !detectedVrn || !evidenceId) {
      return res.status(400).json({ error: "Missing required gate out fields." });
    }

    const result = await gateOutEngine.gateOutVehicle({
      gatePassId, jobId, branchId: getBranchId(req), securityOperatorId,
      captureSource: captureSource || 'MANUAL_CAMERA',
      expectedVrn, detectedVrn, evidenceId
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/claim-task", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const ownerId = String(req.user?.id || 1);
    const { jobId, taskType } = req.body;
    
    if (!jobId || !taskType) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const result = await gateOutEngine.claimTask({ jobId, taskType, ownerId });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/revoke-gate-pass", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const revokedBy = String(req.user?.id || 1);
    const { gatePassId, reason } = req.body;
    
    if (!gatePassId || !reason) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const result = await gateOutEngine.revokeGatePass({
      gatePassId, revokedBy, reason, branchId: getBranchId(req)
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/my-credit-requests", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const cashierId = String(req.user?.id || 1);
    const queue = await gateOutEngine.getMyCreditRequests(getBranchId(req), cashierId);
    res.json(queue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/gm-pending-credits", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const queue = await gateOutEngine.getGMPendingCreditApprovals(getBranchId(req));
    res.json(queue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/paid-today", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const cashierId = String(req.user?.id || 1);
    const queue = await gateOutEngine.getPaidToday(getBranchId(req), cashierId);
    res.json(queue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/gate-pass-ready", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const queue = await gateOutEngine.getGatePassReady(getBranchId(req));
    res.json(queue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/gated-out-today", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const queue = await gateOutEngine.getGatedOutToday(getBranchId(req));
    res.json(queue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/sa-billing-visibility", authenticateJwt, async (req: Request, res: Response) => {
  try {
    const saId = String(req.user?.id || 1);
    const queue = await gateOutEngine.getSABillingVisibility(getBranchId(req), saId);
    res.json(queue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
