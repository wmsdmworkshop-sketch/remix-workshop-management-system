import { Router, Request, Response } from "express";
import { EmployeeIdentityService } from "../../core/identity.ts";
import { authorize } from "../middleware/auth.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — HR & Employee Routes (WP-01 Decomposition)
 * Bounded Context: Human Resources & Workforce Management
 * =============================================================================
 */

export const hrRouter = Router();

// GET /api/employees — List workforce employees
hrRouter.get(
  "/employees",
  authorize("user_management", "view"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const includeLegacy = req.query.includeLegacy === "true";
      const employees = await EmployeeIdentityService.instance.getEmployees(includeLegacy);
      return res.json({ success: true, count: employees.length, data: employees });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);
