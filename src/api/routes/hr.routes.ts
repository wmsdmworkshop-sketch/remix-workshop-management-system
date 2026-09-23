import { Router, Request, Response } from "express";
import { EmployeeIdentityService } from "../../core/identity.ts";
import { authenticateJwt } from "../middleware/auth.ts";
import { pool } from "../../db/index.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — HR & Employee Routes (WP-01 Decomposition)
 * Bounded Context: Human Resources & Workforce Management
 * =============================================================================
 */

export const hrRouter = Router();

// AUDIT: same defect as billing.routes.ts/qc.routes.ts documented before it —
// this router previously ran with no authenticateJwt of its own, inheriting
// server.ts's global authenticateToken, which produces req.user with no
// id/roleId. Any authorize() call on that req.user hashes to a single shared
// cache key for every user, so a permission check could wrongly grant or deny
// everyone at once. authenticateJwt supplies id/roleId so future permission
// checks on this router operate on real per-user values.
hrRouter.use(authenticateJwt);

// GET /api/employees — Authoritative Employee Directory Master.
// Ported from the old inline server.ts handler. That handler's real gap
// was not "no auth" (the global gate already required a valid session) —
// it was no role check, so any authenticated user could read the full
// directory including basic_salary. This port deliberately does NOT add a
// role restriction: src/App.tsx's fetchAllData calls this endpoint for
// every logged-in staff role (technicians, reception, billing, etc. — see
// the ~16 workspaces it feeds), so gating it to a narrow module such as
// user_management would 403 most of the app's own callers, a regression
// against the endpoint's actual audience. Redacting sensitive fields
// (basic_salary, target_revenue, linked_username) for non-manager roles is
// a real, separate need — left for a deliberate follow-up via
// src/core/security/field-permissions.ts, not guessed here.
hrRouter.get(
  "/employees",
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
