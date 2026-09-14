/**
 * AIVAAHAN-ROLE-OPS-IMPL-028 — Phase B gate-out SLA repair
 *
 * tbl_handoff_sla: restore two columns that the gate-out (VOS Phase B) code
 * writes and reads but which were never created.
 *
 * WHY THIS EXISTS
 * ---------------
 * `server.ts` declares tbl_handoff_sla in a `CREATE TABLE IF NOT EXISTS` that
 * includes `job_id` and `opened_at`. The table already existed in production
 * (originally created from `src/db/schema.ts` / the Drizzle definition, which
 * has neither column), so the IF NOT EXISTS was a no-op and the columns were
 * never added. Every gate-out statement that names them therefore failed with
 * `ER_BAD_FIELD_ERROR: Unknown column 's.job_id' in 'on clause'`:
 *
 *   - GET /api/gate-out/security-queue   -> 500
 *   - GET /api/gate-out/cashier-queue    -> 500  (also names s.opened_at)
 *   - GET /api/gate-out/sla-breaches     -> 500
 *   - openSla()  (INSERT)                -> failed silently, error swallowed
 *   - closeSla() (UPDATE ... WHERE job_id) -> failed silently
 *
 * Consequence: the cashier->security SLA clock was never opened or closed, and
 * the three gate-out screens could not load. A vehicle awaiting gate-out had no
 * working Security Gate Out screen.
 *
 * WHY ADD COLUMNS RATHER THAN REWRITE THE QUERIES
 * ----------------------------------------------
 * `job_id` and `entity_id` carry DIFFERENT facts, not duplicates:
 *   openSla("SLA_CASHIER_TO_SECURITY", jobId, gpId, "SECURITY")
 *     -> job_id    = the job
 *     -> entity_id = the gate pass id (stage-specific entity)
 * `entity_id` is a heterogeneous per-stage key (GE-* gate entry, INT-* intake,
 * JC-* job card, GP-* gate pass, pre-invoice id for SLA_BILLING_TO_CASHIER),
 * so it cannot serve as a stable job key. Adding the two columns makes the
 * existing code work as designed with no semantic guessing.
 *
 * SAFETY
 * ------
 * Additive and nullable only. No column is dropped, retyped or renamed, so
 * existing rows and the `entity_id`-keyed engines are untouched. Idempotent —
 * guarded by INFORMATION_SCHEMA checks, matching migration 008's style.
 */

import type { Migration } from "../migrate.ts";
import { pool } from '../index.ts';

const migration: Migration = {
  version: 28,
  name: "handoff_sla_missing_columns",
  up: async (dbPool: typeof pool) => {
    const conn = await (dbPool as any).getConnection();
    try {
      // NOTE: MySQL DDL auto-commits, so this cannot be rolled back as a unit.
      // Each statement below is individually idempotent instead.
      const [cols] = await conn.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_handoff_sla'`
      ) as any[];
      const existing = new Set((cols as any[]).map((c: any) => String(c.COLUMN_NAME).toLowerCase()));

      if (!existing.has('job_id')) {
        await conn.execute(`ALTER TABLE tbl_handoff_sla ADD COLUMN job_id VARCHAR(50) NULL`);
        console.log('✓ tbl_handoff_sla.job_id added');
      } else {
        console.log('  tbl_handoff_sla.job_id already exists — skip');
      }

      if (!existing.has('opened_at')) {
        await conn.execute(
          `ALTER TABLE tbl_handoff_sla ADD COLUMN opened_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP`
        );
        console.log('✓ tbl_handoff_sla.opened_at added');
      } else {
        console.log('  tbl_handoff_sla.opened_at already exists — skip');
      }

      const [idx] = await conn.execute(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_handoff_sla'
           AND INDEX_NAME = 'idx_sla_job'`
      ) as any[];
      if ((idx as any[]).length === 0) {
        await conn.execute(`ALTER TABLE tbl_handoff_sla ADD INDEX idx_sla_job (job_id)`);
        console.log('✓ tbl_handoff_sla.idx_sla_job added');
      } else {
        console.log('  tbl_handoff_sla.idx_sla_job already exists — skip');
      }

      // Backfill job_id for existing cashier->security clocks. Derived from real
      // data only: for that stage, entity_id is the gate pass id, and the gate
      // pass row is the authoritative source of its job. Rows whose entity_id
      // does not resolve to a gate pass keep job_id = NULL (honest empty state)
      // rather than being guessed at.
      const [bf] = await conn.execute(`
        UPDATE tbl_handoff_sla s
          JOIN tbl_gate_pass gp ON gp.gate_pass_id = s.entity_id
           SET s.job_id = gp.job_id
         WHERE s.stage_name = 'SLA_CASHIER_TO_SECURITY' AND s.job_id IS NULL
      `) as any[];
      console.log(`✓ tbl_handoff_sla.job_id backfilled from gate passes (affected=${(bf as any)?.affectedRows ?? 0})`);

      const [remaining] = await conn.execute(
        `SELECT COUNT(*) AS n FROM tbl_handoff_sla WHERE job_id IS NULL`
      ) as any[];
      console.log(`  tbl_handoff_sla rows still without job_id: ${(remaining as any[])[0]?.n ?? 0}`);
    } finally {
      conn.release();
    }
  }
};

export default migration;
