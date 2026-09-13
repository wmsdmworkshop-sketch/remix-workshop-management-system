import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * A service advisor may set the spares figure WHILE ESTIMATING — and only then.
 *
 * WHY THIS EXISTS
 *
 * field_permissions held one rule for this field:
 *
 *   service_advisor · stage ANY · parts_amount · READ_ONLY
 *
 * So an advisor building an estimate could type a spares amount, press "Save
 * Estimate & Lock", and have the write refused with "parts_amount is locked for
 * your role at this stage". The estimate panel offers the field, which means the
 * rule and the screen disagreed: one invited the number, the other refused it.
 *
 * The owner's rule: the advisor edits parts for ESTIMATION, but not at
 * preinvoice or billing — past that point the figure belongs to Parts and the
 * Spare Parts Manager, who approve "Parts Issued: Yes/No".
 *
 * HOW THE STAGES WERE CHOSEN
 *
 * resolveFieldPermission() prefers an exact role+stage match over a role+ANY
 * match, so adding EDIT rules for the estimation stages leaves the existing
 * ANY → READ_ONLY rule in force everywhere else. That is deliberate: the
 * default stays "advisor cannot touch parts", and only the estimating stages
 * are opened. Any stage not named here — preinvoice, billing, gate-out, and
 * anything added later — keeps the restriction without needing a rule of its
 * own.
 *
 * The enforcement call passes `workshop_stage || status`, so both vocabularies
 * are covered: live_status values seen in production (Unassigned, Waiting,
 * GATE_ENTRY_DONE, Assigned, FLOOR_ALLOCATED) and the estimate-flow states the
 * advisor screen writes (ESTIMATE_PENDING, ESTIMATE_SENT).
 *
 * SAFETY
 *
 * Idempotent and additive. It inserts only, never deletes or edits an existing
 * rule, and skips any row already present. The ANY → READ_ONLY rule is
 * untouched, so removing these rows restores the previous behaviour exactly.
 */

/** Stages at which the advisor is still building the estimate. */
const ESTIMATION_STAGES = [
  "Unassigned",
  "Waiting",
  "GATE_ENTRY_DONE",
  "Assigned",
  "FLOOR_ALLOCATED",
  "ESTIMATE_PENDING",
  "ESTIMATE_SENT",
  "Draft",
];

/** The spares fields the estimate panel writes. */
const PARTS_FIELDS = ["parts_amount", "parts_price"];

const migration: Migration = {
  version: 24,
  name: "advisor_parts_at_estimation",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      let added = 0;
      for (const stage of ESTIMATION_STAGES) {
        for (const field of PARTS_FIELDS) {
          const [existing]: any = await connection.query(
            `SELECT id FROM field_permissions
              WHERE role = 'service_advisor' AND workflow_stage = ? AND field_name = ?
              LIMIT 1`,
            [stage, field]
          );
          if ((existing || []).length > 0) continue;

          await connection.execute(
            `INSERT INTO field_permissions (role, workflow_stage, field_name, permission_level)
             VALUES ('service_advisor', ?, ?, 'EDIT')`,
            [stage, field]
          );
          added++;
        }
      }
      console.log(
        `[Migration v24] service_advisor may now edit ${PARTS_FIELDS.join("/")} at ` +
          `${ESTIMATION_STAGES.length} estimation stage(s); ${added} rule(s) added. ` +
          `Preinvoice, billing and every other stage keep the existing READ_ONLY rule.`
      );
    } finally {
      connection.release();
    }
  }
};

export default migration;
