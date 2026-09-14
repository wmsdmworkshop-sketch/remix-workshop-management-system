/**
 * AIVAAHAN-ROLE-OPS-IMPL-030 — Phase C gate-out evidence repair
 *
 * tbl_evidence: add the five columns that the rear-plate capture endpoint writes
 * and that gate-out reads, but which were never created.
 * tbl_gate_out: add `image_url`, which recordGateOut() writes and which has the
 * same defect for the same reason.
 *
 * WHY THIS EXISTS
 * ---------------
 * `server.ts` declares tbl_evidence in a `CREATE TABLE IF NOT EXISTS` whose
 * shape includes `job_id`, `gate_pass_id`, `image_url`, `capture_source` and
 * `captured_by`. The table already exists in production (created from the
 * Drizzle definition / schema dump, which has NONE of those columns — it has
 * `entity_type`, `entity_id`, `storage_path`, `file_path`, `uploaded_by`,
 * `is_locked`, `workflow_type` instead), so the IF NOT EXISTS was a no-op and
 * the columns were never added. This is the same defect migration 028 repaired
 * for tbl_handoff_sla, in the sibling table of the same feature.
 *
 * Consequences — POST /api/gate-out/evidence inserts
 *   (evidence_id, job_id, gate_pass_id, evidence_type, image_url,
 *    capture_source, captured_by, lifecycle_status)
 * against a table with none of the middle five, so it failed with
 * `ER_BAD_FIELD_ERROR` and answered 500 "Failed to register evidence."
 *
 * `recordGateOut()` refuses to complete a gate-out without rear-plate evidence,
 * so the visible effect is that **no vehicle could be gated out at all**: the
 * Security Gate Out screen errors on capture and then reports
 * `REAR_EVIDENCE_REQUIRED: capture the rear plate before gate-out.` — pointing
 * the operator at a step that cannot succeed. Observed end-to-end on
 * 2026-09-14 while driving a job card from gate-in to gate-out.
 *
 * WHY ADD COLUMNS RATHER THAN REWRITE THE QUERIES
 * ----------------------------------------------
 * The two shapes record different facts. The gate-out capture columns are keyed
 * to a JOB and a GATE PASS and describe a camera capture (`image_url`,
 * `capture_source`, `captured_by`); the existing columns are a generic
 * document-evidence model (`entity_type`/`entity_id`, storage paths,
 * `uploaded_by`). Neither is derivable from the other. The billing engine reads
 * `evidence_id` + `lifecycle_status` only, and both already exist in both
 * shapes, so adding columns leaves it untouched. Adding the columns makes the
 * existing, already-shipped code work as designed with no semantic guessing.
 *
 * SAFETY
 * ------
 * Additive and nullable only. No column is dropped, retyped or renamed, so
 * existing rows and every current reader are unaffected. Idempotent — guarded by
 * INFORMATION_SCHEMA checks, matching migrations 008 and 028.
 */

import type { Migration } from "../migrate.ts";
import { pool } from '../index.ts';

const migration: Migration = {
  version: 30,
  name: "evidence_gateout_columns",
  up: async (dbPool: typeof pool) => {
    const conn = await (dbPool as any).getConnection();
    try {
      // NOTE: MySQL DDL auto-commits, so this cannot be rolled back as a unit.
      // Each statement below is individually idempotent instead.
      const columnsOf = async (table: string): Promise<Set<string>> => {
        const [cols] = await conn.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [table]
        ) as any[];
        return new Set((cols as any[]).map((c: any) => String(c.COLUMN_NAME).toLowerCase()));
      };

      const addColumn = async (table: string, name: string, definition: string) => {
        const existing = await columnsOf(table);
        if (existing.has(name)) {
          console.log(`  ${table}.${name} already exists — skip`);
          return;
        }
        await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
        console.log(`✓ ${table}.${name} added`);
      };

      // tbl_evidence — the rear-plate capture written by POST /api/gate-out/evidence.
      // VARCHAR(50) to match the gate-out tables' own keys (tbl_gate_pass.gate_pass_id
      // is VARCHAR(50)); job_id is kept VARCHAR rather than INT because the SLA and
      // gate-pass tables key jobs as strings.
      await addColumn('tbl_evidence', 'job_id', 'VARCHAR(50) NULL');
      await addColumn('tbl_evidence', 'gate_pass_id', 'VARCHAR(50) NULL');
      await addColumn('tbl_evidence', 'image_url', 'TEXT NULL');
      await addColumn('tbl_evidence', 'capture_source', "VARCHAR(50) NULL DEFAULT 'MANUAL_CAMERA'");
      await addColumn('tbl_evidence', 'captured_by', 'VARCHAR(50) NULL');

      // tbl_gate_out — recordGateOut() inserts the capture reference alongside the
      // gate-out row. This table has the SAME defect and the same cause: the
      // `CREATE TABLE IF NOT EXISTS tbl_gate_out` in server.ts declares `image_url`,
      // but the table already existed from a different lineage (it carries `vrn`,
      // `verified_by`, `remarks` instead), so the declaration never took effect.
      await addColumn('tbl_gate_out', 'image_url', 'TEXT NULL');

      // Indexed because recordGateOut() looks the capture up by job on every gate-out.
      const [idx] = await conn.execute(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_evidence' AND INDEX_NAME = 'idx_ev_job'`
      ) as any[];
      if ((idx as any[]).length === 0) {
        await conn.execute(`CREATE INDEX idx_ev_job ON tbl_evidence (job_id)`);
        console.log('✓ tbl_evidence.idx_ev_job created');
      } else {
        console.log('  tbl_evidence.idx_ev_job already exists — skip');
      }
    } finally {
      conn.release();
    }
  },
};

export default migration;
