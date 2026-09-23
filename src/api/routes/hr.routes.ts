import { Router, Request, Response } from "express";
import { EmployeeIdentityService } from "../../core/identity.ts";
import { authorize } from "../middleware/auth.ts";
import { pool } from "../../db/index.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — HR & Employee Routes (WP-01 Decomposition)
 * Bounded Context: Human Resources & Workforce Management
 * =============================================================================
 */

export const hrRouter = Router();

// GET /api/employees — Authoritative Employee Directory Master.
// Ported from the old inline server.ts handler (unauthenticated there — this
// is the fix): merges login-account status from user_access_master and
// defaults target_revenue, matching the response shape existing frontend
// callers (EmployeeDirectory.tsx, UserManagement.tsx) already expect.
hrRouter.get(
  "/employees",
  authorize("user_management", "view"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const includeLegacy = req.query.includeLegacy === "true";
      const employees = await EmployeeIdentityService.instance.getEmployees(includeLegacy);

      let userMap = new Map<number, { user_id: number; username: string; user_role: string }>();
      try {
        const [userRows] = (await pool.query(
          "SELECT user_id, employee_id, username, user_role, is_active FROM user_access_master WHERE employee_id IS NOT NULL AND is_active = 1"
        )) as any[];
        if (userRows) {
          for (const u of userRows) {
            userMap.set(Number(u.employee_id), {
              user_id: u.user_id,
              username: u.username,
              user_role: u.user_role,
            });
          }
        }
      } catch (e) {
        // Safe fallback — matches the inline handler's original behavior.
      }

      const employeesWithDefaults = employees.map((e: any) => {
        const linked = userMap.get(Number(e.employee_id)) || null;
        return {
          ...e,
          target_revenue: e.target_revenue || ((e.basic_salary || 0) * 3),
          has_login_account: !!linked,
          linked_user_id: linked?.user_id || null,
          linked_username: linked?.username || null,
          linked_user_role: linked?.user_role || null,
        };
      });
      return res.json(employeesWithDefaults);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to fetch employees." });
    }
  }
);
