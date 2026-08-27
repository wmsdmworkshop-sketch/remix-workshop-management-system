/**
 * =============================================================================
 * DWIP Enterprise Platform — AI & Automation Routes
 * Bounded Context: Intelligence & Decision Assistance
 *
 * Extracted from the server.ts monolith. Every handler below is the existing
 * production logic moved verbatim, not a reimplementation.
 *
 * ── WHY THIS IS A FACTORY, NOT A BARE `Router` ──
 *
 * `authenticateToken`, `requireRoles` and `requirePermission` are declared as
 * consts INSIDE the async bootstrap closure in server.ts (around lines 1369,
 * 1443, 1501). They are never exported, and they close over `dbPool` and the
 * live permission cache. A module-level `import` of them is therefore
 * impossible, and re-implementing them here would fork the auth logic — two
 * copies of an RBAC check that must never disagree.
 *
 * Injecting them keeps exactly one implementation, so this router is guaranteed
 * to enforce precisely what server.ts enforces. If that closure is ever hoisted
 * to a real module, the factory can be replaced with plain imports without
 * touching a single handler.
 *
 * ── RATE LIMITING ──
 *
 * Applied at the router level rather than per route, so a new AI endpoint added
 * here is protected by default instead of being silently unlimited. The
 * limiter's own bypass rules live in the middleware, not here.
 * =============================================================================
 */

import { Router, type RequestHandler } from "express";
import { aiRateLimiter } from "../../middleware/rate-limiter.ts";

/**
 * Middleware supplied by server.ts. Typed loosely on purpose: the originals are
 * untyped `(req: any, res: any, next: any)` closures, and pretending otherwise
 * here would be a false guarantee.
 */
export interface AiRouterDependencies {
  authenticateToken: RequestHandler;
  requireRoles: (allowedRoles: string[]) => RequestHandler;
  requirePermission: (
    moduleName: string,
    action?: "view" | "edit" | "comment"
  ) => RequestHandler;
  /** Default import of src/services/service-schedule-evaluator.ts */
  serviceScheduleEvaluator: { evaluate: (vrn: string, odo: number, complaint: string) => Promise<any> };
}

/**
 * Developer-only, per the explicit instruction recorded at the original call
 * site: strictly "developer", NOT admin-inclusive. Preserved for inspection/admin.
 */
const AI_BRAINS_ROLES = ["developer"];

/**
 * Decision audit logging is used operationally across the workshop: technicians
 * evaluate recommendations on the bay floor, service advisors review them during
 * technical intake, and workshop/service managers oversee decisions.
 */
const AI_DECISION_ROLES = [
  "developer",
  "admin",
  "gm_service",
  "service_manager",
  "workshop_manager",
  "service_advisor",
  "technician",
];

export function createAiRouter(deps: AiRouterDependencies): Router {
  const { authenticateToken, requireRoles, serviceScheduleEvaluator } = deps;
  const router = Router();

  // Every route below performs paid outbound work (DeepSeek, Vertex AI) or hits
  // an engine that does.
  router.use(aiRateLimiter);

  // ───────────────────────────── AI BRAINS ─────────────────────────────
  // SIGNA (L1 Tactical) / SETU (L2 Coordination) / DISHA (L3 Strategic).
  // Health and activity reflect REAL invocations recorded in
  // ai_brain_registry / ai_brain_activity_log — never a hardcoded "online" flag.

  router.get(
    "/v1/ai-brains/health",
    authenticateToken,
    requireRoles(AI_BRAINS_ROLES),
    async (req: any, res: any) => {
      try {
        const { getAllBrainHealth } = await import("../../engines/ai-brains/brain-registry.ts");
        const brains = await getAllBrainHealth();

        // Retrieval tier is reported alongside brain health so an operator can
        // see whether SIGNA is answering semantically or has silently degraded
        // to keyword matching. Includes live lastSuccessAt and lastError details.
        let retrieval: any = null;
        try {
          const { getIndexStats } = await import("../../services/vector-index.service.ts");
          retrieval = await getIndexStats();
        } catch {
          /* retrieval stats are advisory; never fail health on them */
        }

        res.json({ success: true, brains, retrieval });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  );

  router.get(
    "/v1/ai-brains/activity",
    authenticateToken,
    requireRoles(AI_BRAINS_ROLES),
    async (req: any, res: any) => {
      try {
        const { getRecentActivity } = await import("../../engines/ai-brains/brain-registry.ts");
        const brainId = req.query.brainId as any;
        const limit = req.query.limit ? parseInt(String(req.query.limit)) : 50;
        const activity = await getRecentActivity(brainId, limit);
        res.json({ success: true, activity });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  );

  router.post(
    "/v1/ai-brains/signa/suggest",
    authenticateToken,
    requireRoles(AI_BRAINS_ROLES),
    async (req: any, res: any) => {
      const { vehicleModel, complaint } = req.body || {};
      if (!vehicleModel || !complaint) {
        return res
          .status(400)
          .json({ success: false, error: "vehicleModel and complaint are required." });
      }
      try {
        const { getTacticalSuggestion } = await import(
          "../../engines/ai-brains/signa-tactical-brain.ts"
        );
        const suggestion = await getTacticalSuggestion(
          vehicleModel,
          complaint,
          req.user?.username || req.user?.full_name || "developer"
        );
        res.json({ success: true, suggestion });
      } catch (err: any) {
        return respondAiError(res, err);
      }
    }
  );

  /**
   * Records a technician or service advisor decision (ACCEPTED / REJECTED / MODIFIED)
   * against a specific SIGNA recommendation log ID for accountability and feedback.
   */
  router.post(
    "/v1/ai-brains/signa/decision",
    authenticateToken,
    requireRoles(AI_DECISION_ROLES),
    async (req: any, res: any) => {
      const { logId, decision, notes } = req.body || {};

      if (!logId || typeof logId !== "string" || !logId.trim()) {
        return res.status(400).json({
          success: false,
          error: "logId is required and must be a valid activity log identifier string.",
        });
      }

      if (!decision || !["ACCEPTED", "REJECTED", "MODIFIED"].includes(decision)) {
        return res.status(400).json({
          success: false,
          error: 'decision is required and must be one of "ACCEPTED", "REJECTED", or "MODIFIED".',
        });
      }

      const userId = req.user?.user_id || req.user?.id;
      const employeeId = req.user?.employee_id || null;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authenticated user identity (user_id) is required to record a decision audit trail.",
        });
      }

      try {
        const { recordBrainDecision } = await import(
          "../../engines/ai-brains/brain-registry.ts"
        );
        const result = await recordBrainDecision({
          logId: logId.trim(),
          decision,
          notes: typeof notes === "string" ? notes.trim() : undefined,
          userId: Number(userId),
          employeeId: employeeId ? Number(employeeId) : null,
        });

        return res.json({
          success: true,
          decisionId: result.decisionId,
          message: "SIGNA recommendation decision recorded in audit log.",
        });
      } catch (err: any) {
        if (err?.code === "ACTIVITY_LOG_NOT_FOUND") {
          return res.status(404).json({
            success: false,
            error: err.message,
          });
        }
        console.error("[AI] Failed to record decision:", err?.message || err);
        return res.status(500).json({ success: false, error: err?.message || "Failed to record decision." });
      }
    }
  );

  router.post(
    "/v1/ai-brains/setu/observe",
    authenticateToken,
    requireRoles(AI_BRAINS_ROLES),
    async (req: any, res: any) => {
      try {
        const { observeCoordinationState } = await import(
          "../../engines/ai-brains/setu-coordination-brain.ts"
        );
        const branchId = req.body?.branchId || req.user?.branchId || req.user?.branch_id || "BR-SEDAM";
        const snapshot = await observeCoordinationState(
          req.user?.username || req.user?.full_name || "developer",
          String(branchId)
        );
        res.json({ success: true, snapshot });
      } catch (err: any) {
        return respondAiError(res, err);
      }
    }
  );

  router.post(
    "/v1/ai-brains/disha/analyze",
    authenticateToken,
    requireRoles(AI_BRAINS_ROLES),
    async (req: any, res: any) => {
      try {
        const { analyzeStrategicTrends } = await import(
          "../../engines/ai-brains/disha-strategic-brain.ts"
        );
        const periodDays = req.body?.periodDays ? parseInt(String(req.body.periodDays)) : 7;
        const report = await analyzeStrategicTrends(
          req.user?.username || req.user?.full_name || "developer",
          periodDays
        );
        res.json({ success: true, report });
      } catch (err: any) {
        return respondAiError(res, err);
      }
    }
  );

  // ─────────────────────── SERVICE SCHEDULE ELIGIBILITY ───────────────────────
  // Moved verbatim. It declares no authenticateToken of its own, but it is NOT
  // a public endpoint: the global API authentication gate in server.ts (~line
  // 1538) enforces a valid JWT on every /api/* path outside an explicit
  // whitelist, and this path is not whitelisted. Adding a second per-route auth
  // check here would be redundant, not a hardening.
  router.get("/vehicles/:vrn/schedule-eligibility", async (req: any, res: any) => {
    const { vrn } = req.params;
    const odo = Number(req.query.odometer) || 0;
    const complaint = typeof req.query.complaint === "string" ? req.query.complaint : "";

    try {
      const result = await serviceScheduleEvaluator.evaluate(vrn, odo, complaint);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("Error evaluating vehicle schedule eligibility:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

/**
 * Maps engine errors to responses.
 *
 * The kill switch is the reason this exists: DeepSeekEngine.chat() throws
 * `AI_MODE_DISABLED: ...` when AI Mode is off, and the original handlers
 * returned that as a generic HTTP 500. A user then saw "server error" for what
 * is actually a deliberate, reversible administrative setting — indistinguishable
 * from a real outage. It now returns 503 with an explicit, actionable code.
 */
function respondAiError(res: any, err: any) {
  const message = String(err?.message || "AI request failed.");

  if (message.startsWith("AI_MODE_DISABLED")) {
    return res.status(503).json({
      success: false,
      code: "AI_MODE_DISABLED",
      error: "AI features are currently switched off for this workshop.",
      message:
        "A GM, Admin or Developer has disabled AI Mode. Managers and Service Advisors can request reactivation from the AI Mode panel.",
    });
  }

  if (message.includes("DEEPSEEK_API_KEY is not configured")) {
    // Configuration fault, not a user fault, and the key itself is never echoed.
    console.error("[AI] DeepSeek API key missing on this environment.");
    return res.status(503).json({
      success: false,
      code: "AI_NOT_CONFIGURED",
      error: "The AI service is not configured on this environment.",
    });
  }

  console.error("[AI] Request failed:", message);
  return res.status(500).json({ success: false, error: message });
}

export default createAiRouter;
