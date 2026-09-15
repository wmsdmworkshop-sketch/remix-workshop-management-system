import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * The Service Advisor's pre-invoice steps, gated on a module that exists.
 *
 * WHY THIS EXISTS
 *
 * The advisor's own screen, `ServiceAdvisorWorkspace.SAPreInvoicePanel`, calls
 * five routes to build a pre-invoice and hand it to billing:
 *
 *   POST /api/billing/pre-invoice/compile/:jobId
 *   POST /api/billing/pre-invoice/review/:preInvoiceId
 *   POST /api/billing/pre-invoice/send-to-customer/:preInvoiceId
 *   POST /api/billing/pre-invoice/capture-confirmation/:preInvoiceId
 *   POST /api/billing/handoff/:preInvoiceId
 *
 * All five were `authorize("billing", "edit")`. The `service_advisor` role holds
 * `Billing` with `can_view = 1, can_edit = 0`, so every one of them was
 * deny-by-default for the role that owns the screen showing the button. Observed
 * live 2026-09-15 on JC-41368: the advisor had acknowledged the QC pass, recorded
 * the ₹2,000 estimate, `GET /api/billing/ready-from-qc` listed the vehicle, and
 * `POST /api/billing/pre-invoice/check-readiness/7386` answered
 * `{ ready: true, blockers: [] }` — every gate clear — but the Compile button
 * could only ever return 403.
 *
 * This matches the owner's written workflow (`src/workflow.md`): "service advisor
 * builds preinvoice ... & then mark it to billing state: billing user now
 * generates the invoice". The advisor builds it; billing generates the invoice.
 * The five routes above are the "builds it" half.
 *
 * WHY A NEW MODULE AND NOT `Billing.can_edit = 1`
 *
 * `Billing` edit also gates `crm-invoice` (captures the statutory CRM invoice),
 * `manual-gate-pass/raise`, `manual-gate-pass/:mgpId/gm-action` and
 * `reconcile-crm`. Granting it to `service_advisor` would let an advisor approve a
 * Manual Gate Pass — i.e. release a vehicle — which is precisely the authority the
 * owner restricted on 2026-09-14 ("only developer and gm_service may issue a
 * gate-out pass without payment settled"). Widening the whole module is therefore
 * not an option; carving out the five advisor steps is.
 *
 * MODULE NAME
 *
 * Must equal the route key case-insensitively. `findByRoleAndModule` compares
 * `LOWER(module_name)` against the key with no space/underscore normalisation
 * (only role names are normalised). 026 and 029 set the precedent of naming the
 * module after the upper-cased route key, so key `pre_invoice` -> `PRE_INVOICE`.
 *
 * WHO, AND WHY
 *
 * `service_advisor` is the grant this migration exists for. `billing`, `cashier`
 * and `gm_service` are included because they currently hold `Billing.can_edit = 1`
 * and so could already call these five routes; re-gating without them would
 * silently REMOVE a capability. That is the one place this migration is wider than
 * 029's "single role and no wider" rule, and it is deliberate: 029 was creating
 * access where none existed, this one is moving access that already existed.
 * `admin` and `developer` bypass the lookup entirely and need no row.
 *
 * SAFETY
 *
 * Idempotent and additive. The module is created only if absent, a grant is
 * inserted only if absent, and nothing existing is modified or removed. Reversal is
 * deleting the `PRE_INVOICE` rows, which restores the previous behaviour.
 */

const MODULE = "PRE_INVOICE";

/** service_advisor is the fix; the rest already had this access via Billing.edit. */
const ROLES = ["service_advisor", "billing", "cashier", "gm_service"];

const migration: Migration = {
  version: 31,
  name: "sa_pre_invoice_module",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      let moduleCreated = false;
      let granted = 0;
      let skipped = 0;

      const [existingModule]: any = await connection.query(
        "SELECT module_id FROM modules WHERE LOWER(module_name) = LOWER(?) LIMIT 1",
        [MODULE]
      );

      let moduleId: number;
      if ((existingModule || []).length > 0) {
        moduleId = Number(existingModule[0].module_id);
        console.log(`  module '${MODULE}' already present (id ${moduleId})`);
      } else {
        const [ins]: any = await connection.execute(
          "INSERT INTO modules (module_name) VALUES (?)",
          [MODULE]
        );
        moduleId = Number(ins.insertId);
        moduleCreated = true;
        console.log(
          `  + created module '${MODULE}' (id ${moduleId}) — unlocks the advisor's pre-invoice steps`
        );
      }

      for (const roleName of ROLES) {
        // role_permissions is keyed by role_id, but some live rows carry only a
        // role NAME (role_id NULL). Look the id up where it exists; the repo
        // matches on name too, so a name-only row still resolves.
        const [roleRow]: any = await connection.query(
          "SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER(?) LIMIT 1",
          [roleName]
        );
        const roleId = (roleRow || []).length > 0 ? Number(roleRow[0].role_id) : null;

        // Match on role_name, and on role_id ONLY when there is a real id.
        // `role_id <=> ?` with a NULL roleId would match every row whose role_id
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
          [roleId, roleName, moduleId, MODULE]
        );
        granted++;
        console.log(`  + granted '${MODULE}' view+edit to '${roleName}'`);
      }

      console.log(
        `[Migration v31] ${moduleCreated ? "created" : "reused"} module '${MODULE}', ` +
          `${granted} grant(s) added (${skipped} already present). ` +
          `No user, employee or login was created.`
      );
    } finally {
      connection.release();
    }
  }
};

export default migration;
