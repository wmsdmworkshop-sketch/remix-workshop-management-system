import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * Repoint nine foreign keys from the dead `job_cards` table to `job_card_master`.
 *
 * WHY
 * ---
 * `job_cards` holds 4 seed rows (VRN1-4 / "Test User", ids 901-904). The live
 * table is `job_card_master` (135 rows, ids 6658+). The two id spaces do not
 * overlap at all, so any child row referencing a REAL vehicle was rejected by
 * these constraints. Production symptom, on every single job-card creation:
 *
 *   Failed to publish initial events during Job Card creation:
 *   foreign key constraint fails (railway.tbl_workflow_history,
 *   CONSTRAINT fk_twh_job FOREIGN KEY (job_id) REFERENCES job_cards (job_id))
 *
 * The consequence is worse than log noise: workflow history was never recorded
 * for any real job card, which hollows out the accountability trail. It also
 * explains why several tables looked "unused" in the schema census — they were
 * not unused, they were UNWRITABLE.
 *
 * SAFETY
 * ------
 * Eight of the nine child tables are completely EMPTY (verified against
 * production), so there is nothing to migrate and nothing to orphan.
 *
 * `tbl_workflow_history` held 88 rows, all written in one 12-minute window on
 * 2026-08-04 05:20:39-05:31:14. All 78 of their distinct job_ids match the 81
 * orphaned `tbl_pre_invoice` rows from the same window — one test-seed run, no
 * link to any real vehicle. They are deleted so the new constraint can be
 * created (job_id is NOT NULL, so they cannot simply be nulled out).
 *
 * THE NON-OBVIOUS PART
 * --------------------
 * `job_card_master.job_card_id` is INT UNSIGNED; every child column is INT
 * (signed). MySQL refuses a foreign key across mismatched signedness:
 *
 *   Referencing column 'job_id' and referenced column 'job_card_id' in foreign
 *   key constraint '...' are incompatible.
 *
 * So each column must be widened to INT UNSIGNED *before* the constraint is
 * added. Verified on a scratch table copy before writing this migration.
 *
 * RE-RUNNABILITY
 * --------------
 * MySQL DDL is not transactional, so a failure part-way cannot be rolled back.
 * Every step is therefore tolerant of already-applied state (constraint already
 * dropped, column already unsigned, constraint already added), which makes the
 * migration safe to simply run again. Migrations fail closed at boot, so a step
 * that fails for an unexpected reason still blocks startup rather than leaving
 * the schema half-changed and unnoticed.
 *
 * ON DELETE behaviour is deliberately left unspecified (MySQL default
 * RESTRICT), matching the constraints being replaced. Changing deletion
 * semantics is a separate decision.
 */

type FkTarget = {
  table: string;
  column: string;
  constraint: string;
  /** Column nullability must be preserved exactly when widening. */
  notNull: boolean;
};

const TARGETS: FkTarget[] = [
  { table: "tbl_workflow_history", column: "job_id", constraint: "fk_twh_job", notNull: true },
  { table: "job_technician_maps", column: "job_id", constraint: "fk_jtm_job", notNull: true },
  { table: "carry_forward_logs", column: "job_id", constraint: "fk_cfl_job", notNull: true },
  { table: "job_revenues", column: "job_id", constraint: "fk_job_rev_job", notNull: true },
  { table: "rework_logs", column: "original_job_id", constraint: "fk_rwl_original", notNull: true },
  { table: "customer_feedback", column: "job_id", constraint: "customer_feedback_ibfk_2", notNull: true },
  { table: "digital_approvals", column: "job_id", constraint: "digital_approvals_ibfk_1", notNull: true },
  { table: "warranty_claims", column: "job_id", constraint: "warranty_claims_ibfk_1", notNull: true },
  // The only nullable one of the nine.
  { table: "overtime_requests", column: "job_card_id", constraint: "overtime_requests_ibfk_4", notNull: false },
];

const migration: Migration = {
  version: 17,
  name: "repoint_job_fks_to_master",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      // Only this table had rows, and only seed rows (see header). Every other
      // table in TARGETS is empty, so nothing else loses data.
      await connection.execute(`DELETE FROM tbl_workflow_history`);

      for (const t of TARGETS) {
        // 1. Drop the old constraint. Tolerated if already gone (re-run).
        try {
          await connection.execute(
            `ALTER TABLE \`${t.table}\` DROP FOREIGN KEY \`${t.constraint}\``
          );
        } catch (err: any) {
          if (!/check that column\/key exists|1091|doesn't exist/i.test(err.message)) throw err;
        }

        // 2. Widen to INT UNSIGNED so the type matches job_card_master.job_card_id.
        //    Idempotent: re-running on an already-unsigned column is a no-op.
        await connection.execute(
          `ALTER TABLE \`${t.table}\` MODIFY \`${t.column}\` INT UNSIGNED ${t.notNull ? "NOT NULL" : "NULL"}`
        );

        // 3. Point it at the real job-card table. Tolerated if already present.
        try {
          await connection.execute(
            `ALTER TABLE \`${t.table}\`
               ADD CONSTRAINT \`${t.constraint}\`
               FOREIGN KEY (\`${t.column}\`) REFERENCES \`job_card_master\`(\`job_card_id\`)`
          );
        } catch (err: any) {
          if (!/Duplicate (key|foreign key constraint) name|1826|already exists/i.test(err.message)) throw err;
        }
      }
    } finally {
      connection.release();
    }
  },
};

export default migration;
