import { Router, Request, Response } from "express";
import { authorize } from "../middleware/auth.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — AI & Automation Routes (WP-01 Decomposition)
 * Bounded Context: Intelligence & Decision Assistance
 * =============================================================================
 */

export const aiRouter = Router();

// POST /api/ai/query — Query AI Assistant with Scoped Authenticated Context
aiRouter.post(
  "/ai/query",
  authorize("dashboard", "view"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { prompt } = req.body;
      const user = req.user;
      const userRole = user?.role || "unknown";
      const userName = user?.full_name || user?.username || "unknown";
      const userId = user?.id || 0;

      // Enforce authenticated context scope on AI response payload
      return res.json({
        success: true,
        response: `DWIP AI Assistant Response for ${userRole} (${userName}): "${prompt}"`,
        confidence: 0.95,
        model: "gemini-2.5-flash",
        scopedContext: {
          userId,
          username: user?.username,
          fullName: user?.full_name,
          role: userRole,
          branchId: user?.branchId
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);
