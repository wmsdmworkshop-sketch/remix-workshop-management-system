import { Router, Request, Response } from "express";
import { getDbHealthMetrics } from "../../db/index.ts";
import { authorize } from "../middleware/auth.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — Analytics & Executive MIS Routes (WP-01 Decomposition)
 * Bounded Context: Analytics & Executive Dashboard
 * =============================================================================
 */

export const analyticsRouter = Router();

// GET /api/analytics/kpis — Executive MIS snapshot
analyticsRouter.get(
  "/analytics/kpis",
  authorize("dashboard", "view"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const dbMetrics = getDbHealthMetrics();
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        kpis: {
          active_job_cards: 42,
          bays_utilized: 7,
          revenue_today: 185400,
          db_health: dbMetrics
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);
