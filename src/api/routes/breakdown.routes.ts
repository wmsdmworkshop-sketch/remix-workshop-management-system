import { Router, Request, Response } from "express";
import { pool } from "../../db/index.ts";
import { authorize } from "../middleware/auth.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — Breakdown & Assistance Routes (WP-01 Decomposition)
 * Bounded Context: Roadside Assistance & Breakdown Intake
 * =============================================================================
 */

export const breakdownRouter = Router();

// GET /api/breakdowns — List breakdown service tickets
breakdownRouter.get(
  "/breakdowns",
  authorize("breakdowns", "view"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM breakdown_tickets ORDER BY ticket_id DESC LIMIT 100"
      ) as any[];
      return res.json({ success: true, count: rows.length, data: rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);
