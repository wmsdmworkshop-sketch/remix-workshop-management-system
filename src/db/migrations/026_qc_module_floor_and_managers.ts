import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * Quality inspection is performed by the FLOOR INCHARGE or a MANAGER.
 *
 * WHY THIS EXISTS
 *
 * The QC screen rendered a queue but no user on site could act on it. Three
 * separate facts, each verified against production:
 *
 *   1. `modules` held twelve rows and NONE of them was QC. Every QC route is
 *      guarded by authorize("qc", ...), which resolves the module by name; with
 *      no row, findByRoleAndModule() returns nothing, roleAllowed stays false,
 *      and the call is refused. Only 'admin' and 'developer' got through,
 *      because AuthorizationService short-circuits those two before the lookup.
 *   2. No employee holds a QC role — 51 active staff across 19 job titles, none
 *      of them QC or quality.
 *   3. `employees.is_qc_eligible` is 0 for every row.
 *
 * So a workshop_manager could open the QC workspace, see a vehicle waiting, and
 * be refused on submit. That is the "QC waiting 1, nowhere connected" the owner
 * reported.
 *
 * THE OWNER'S RULE: "qc can be done by floor incharge or manager".
 *
 * This creates the missing module and grants it to exactly those roles. It does
 * NOT invent a QC employee or a QC login — per the standing rule that no user
 * is ever created except by an administrator. QC becomes a RESPONSIBILITY of
 * people who already have accounts, not a new identity.
 *
 * WHICH ROLE NAMES, AND WHY THESE
 *
 * Taken from the live `users.role` values, not guessed. Both floor spellings
 * exist in production (floor_supervisor x2, floor_incharge x1) and both are the
 * same job, so both are granted — omitting either would leave a real person
 * locked out. The manager set is the workshop/service management line plus the
 * GM; spares and warranty managers are deliberately EXCLUDED, as their approval
 * duties are separate from inspecting the repair.
 *
 * can_approve/can_reject are granted alongside can_edit because a QC decision is
 * a pass/reject, and the 10-step engine checks the action it is given.
 *
 * SAFETY
 *
 * Idempotent and additive. The module is created only if absent, each grant is
 * inserted only if absent, and nothing existing is modified or removed.
 * Reversing it is deleting these rows, which restores the prior deny-all.
 */

/** Exactly who may inspect, per the owner's rule. Live users.role spellings. */
const QC_ROLES = [
  // Floor — both spellings are in production for the same job.
  "floor_incharge",
  "floor_supervisor",
  // Managers.
  "workshop_manager",
  "service_manager",
  "works_manager",
  "gm_service",
];

const MODULE_NAME = "QC";

const migration: Migration = {
  version: 26,
  name: "qc_module_floor_and_managers",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      // 1. The module the QC routes ask for by name.
      const [existingModule]: any = await connection.query(
        "SELECT module_id FROM modules WHERE LOWER(module_name) = LOWER(?) LIMIT 1",
        [MODULE_NAME]
      );

      let moduleId: number;
      if ((existingModule || []).length > 0) {
        moduleId = Number(existingModule[0].module_id);
        console.log(`[Migration v26] Module '${MODULE_NAME}' already present (id ${moduleId}).`);
      } else {
        const [ins]: any = await connection.execute(
          "INSERT INTO modules (module_name) VALUES (?)",
          [MODULE_NAME]
        );
        moduleId = Number(ins.insertId);
        console.log(`[Migration v26] Created module '${MODULE_NAME}' (id ${moduleId}).`);
      }

      // 2. Grant it to the floor incharge and the managers.
      let granted = 0;
      let skipped = 0;
      for (const roleName of QC_ROLES) {
        // role_permissions is keyed by role_id, but several live users carry a
        // role NAME with no matching roles row (role_id NULL). Look the id up
        // where it exists; the permission repo matches on name as well, so a
        // row keyed by name still resolves for those users.
        const [roleRow]: any = await connection.query(
          "SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER(?) LIMIT 1",
          [roleName]
        );
        const roleId = (roleRow || []).length > 0 ? Number(roleRow[0].role_id) : null;

        // Match on role_name, and on role_id ONLY when there is a real id.
        // `role_id <=> ?` with a NULL roleId matches EVERY row whose role_id is
        // null, so the first name-only grant made every later name-only role
        // look as though it had already been granted.
        const [existing]: any = await connection.query(
          `SELECT permission_id FROM role_permissions
            WHERE module_id = ?
              AND (LOWER(role_name) = LOWER(?) OR (? IS NOT NULL AND role_id = ?))
            LIMIT 1`,
          [moduleId, roleName, roleId, roleId]
        );
        if ((existing || []).length > 0) { skipped++; continue; }

        await connection.execute(
          `INSERT INTO role_permissions
             (role_id, role_name, module_id, module_name,
              can_view, can_edit, can_approve, can_reject)
           VALUES (?, ?, ?, ?, 1, 1, 1, 1)`,
          [roleId, roleName, moduleId, MODULE_NAME]
        );
        granted++;
      }

      console.log(
        `[Migration v26] QC inspection granted to ${granted} role(s) ` +
          `(${skipped} already had it): ${QC_ROLES.join(", ")}. ` +
          `No QC user or employee was created — QC is a duty of existing accounts.`
      );
    } finally {
      connection.release();
    }
  }
};

export default migration;
