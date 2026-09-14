import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * The three permission modules that no route could ever satisfy.
 *
 * WHY THIS EXISTS
 *
 * `PermissionRepository.findByRoleAndModule` resolves a module by comparing the
 * lowercased `module_name` against the key the route passes, with only three
 * aliases (job_card(s) -> Job Cards, user_management/users -> User Management,
 * breakdown -> Breakdowns). `modules` held thirteen rows and these three keys
 * matched NONE of them, so every route below was deny-by-default for every real
 * role and only 'admin'/'developer' ever got through — because
 * `AuthorizationService.checkPermission` short-circuits those two before it does
 * any lookup:
 *
 *   authorize("service_advisor", ...)  -> POST /api/qc/sa-acknowledge/:jobId
 *                                         GET  /api/qc/pre-invoice-readiness/:jobId
 *   authorize("floor", ...)            -> POST /api/qc/rework/complete/:jobId
 *   authorize("spares", ...)           -> all 7 /api/parts/* routes (my-queue,
 *                                         stock-check, acknowledge, fulfill,
 *                                         backorder, reject, my-fulfilled-today)
 *
 * Consequence in production: a vehicle could pass QC and then nothing could move
 * it on. The Service Advisor could not acknowledge the pass (so the job never
 * reached PRE_INVOICE_READY and never entered the pre-invoice queue), a floor
 * supervisor could not complete rework, and the spares manager could not work the
 * parts queue at all. Only an admin account could, which is why the workflow
 * appeared to work while every real role was locked out.
 *
 * This is the same defect migration 026 fixed for `QC`, and it is fixed the same
 * way: create the missing module, grant it to the roles that own the work.
 *
 * MODULE NAMES
 *
 * The name must equal the route key case-insensitively — module_name is compared
 * with LOWER() and is NOT normalised for spaces/underscores (unlike role_name,
 * which is). So "Service Advisor" would NOT resolve; the upper-cased key does.
 * 026 set exactly this precedent with the module named "QC" for key `qc`.
 *
 * WHO, AND WHY ONLY THESE
 *
 * Least privilege: each module is granted to the single role the route names and
 * no wider. 026 could include managers because the owner's rule for QC was "qc
 * can be done by floor incharge or manager" — there is no equivalent rule for
 * these three duties, so nothing is inferred. Widening any of them is one extra
 * name in the list below. `floor_incharge` is absent deliberately: migration 027
 * merged it into `floor_supervisor`.
 *
 * can_approve/can_reject are left at their default 0, unlike 026. Those flags were
 * needed there because a QC decision is a literal pass/reject; no route guarded by
 * these three modules has an approve or reject action, so granting them would be
 * an over-grant.
 *
 * SAFETY
 *
 * Idempotent and additive. A module is created only if absent, a grant is inserted
 * only if absent, and nothing existing is modified or removed. Reversal is
 * deleting these rows, which restores the previous deny-all.
 */

interface ModuleGrant {
  /** Must equal the route key case-insensitively. */
  module: string;
  roles: string[];
  /** What is unreachable without it. */
  why: string;
}

const GRANTS: ModuleGrant[] = [
  {
    module: "SERVICE_ADVISOR",
    roles: ["service_advisor"],
    why: "acknowledging a QC pass (QC_PASSED -> PRE_INVOICE_READY) and reading pre-invoice readiness",
  },
  {
    module: "FLOOR",
    roles: ["floor_supervisor"],
    why: "completing rework after a QC failure",
  },
  {
    module: "SPARES",
    roles: ["spares_manager"],
    why: "the whole parts queue: acknowledge, fulfill, backorder, reject",
  },
];

const migration: Migration = {
  version: 29,
  name: "missing_permission_modules",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      let modulesCreated = 0;
      let granted = 0;
      let skipped = 0;

      for (const g of GRANTS) {
        // 1. The module the routes ask for by name.
        const [existingModule]: any = await connection.query(
          "SELECT module_id FROM modules WHERE LOWER(module_name) = LOWER(?) LIMIT 1",
          [g.module]
        );

        let moduleId: number;
        if ((existingModule || []).length > 0) {
          moduleId = Number(existingModule[0].module_id);
          console.log(`  module '${g.module}' already present (id ${moduleId})`);
        } else {
          const [ins]: any = await connection.execute(
            "INSERT INTO modules (module_name) VALUES (?)",
            [g.module]
          );
          moduleId = Number(ins.insertId);
          modulesCreated++;
          console.log(`  + created module '${g.module}' (id ${moduleId}) — unlocks ${g.why}`);
        }

        for (const roleName of g.roles) {
          // role_permissions is keyed by role_id, but some live rows carry only a
          // role NAME (role_id NULL, e.g. works_manager on the QC module). Look the
          // id up where it exists; the repo matches on name too, so a name-only row
          // still resolves.
          const [roleRow]: any = await connection.query(
            "SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER(?) LIMIT 1",
            [roleName]
          );
          const roleId = (roleRow || []).length > 0 ? Number(roleRow[0].role_id) : null;

          // Match on role_name, and on role_id ONLY when there is a real id.
          // `role_id <=> ?` with a NULL roleId would match EVERY row whose role_id
          // is null, making each later name-only grant look already-present.
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
               (role_id, role_name, module_id, module_name, can_view, can_edit)
             VALUES (?, ?, ?, ?, 1, 1)`,
            [roleId, roleName, moduleId, g.module]
          );
          granted++;
          console.log(`  + granted '${g.module}' view+edit to '${roleName}'`);
        }
      }

      console.log(
        `[Migration v29] ${modulesCreated} module(s) created, ${granted} grant(s) added ` +
          `(${skipped} already present). Admin/developer were never affected — they bypass the ` +
          `lookup entirely. No user, employee or login was created.`
      );
    } finally {
      connection.release();
    }
  }
};

export default migration;
