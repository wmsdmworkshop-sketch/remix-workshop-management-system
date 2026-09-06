/**
 * Migration 011 — Floor Execution Tables
 *
 * floor-execution-engine.ts (bay/technician allocation, repair timers, QC
 * handoff) has been fully built and referenced by floor-execution.routes.ts
 * since an earlier phase, but that route file was never mounted on the live
 * server and its four backing tables were never migrated into production —
 * confirmed by direct query against the live DB (tbl_bays, tbl_job_allocations,
 * tbl_repair_executions, tbl_qc_handoff all MISSING; every other table this
 * engine and its siblings reference already exists via sync.ts or migrations
 * 008-010).
 *
 * Column shapes below are taken directly from floor-execution-engine.ts's own
 * INSERT/UPDATE/SELECT statements (the only place these tables are defined),
 * not invented — this is the "reuse, don't invent" reconciliation the
 * linear-workflow plan calls for.
 *
 * All idempotent (CREATE TABLE IF NOT EXISTS). No destructive operations.
 */

import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

const migration: Migration = {
  version: 11,
  name: "floor_execution_tables",
  up: async (pool: typeof db) => {
    const conn = await (pool as any).getConnection();
    try {
      await conn.beginTransaction();

      // tbl_bays — real-time bay control (floor-execution-engine.ts:233-263,
      // allocateJobAndBay's UPDATE at :353-356, handoffToQc's free-bay UPDATE
      // at :900-903). Seeded with the same 6 bays the engine's in-memory
      // fallback used, so an empty production table doesn't start with zero
      // usable bays.
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS tbl_bays (
          bay_id              VARCHAR(20) PRIMARY KEY,
          bay_name            VARCHAR(100) NOT NULL,
          bay_type            VARCHAR(50) NOT NULL,
          lob_suitability     VARCHAR(50) NOT NULL DEFAULT 'ALL',
          status              VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
          current_job_card_id VARCHAR(50) NULL,
          current_vrn         VARCHAR(30) NULL,
          occupied_since      DATETIME NULL,
          branch_id           VARCHAR(50) NOT NULL DEFAULT 'BR-SEDAM',
          created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_bays_branch (branch_id),
          INDEX idx_bays_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      const [bayCount]: any = await conn.execute(`SELECT COUNT(*) AS n FROM tbl_bays`);
      if (bayCount[0].n === 0) {
        await conn.execute(
          `INSERT INTO tbl_bays (bay_id, bay_name, bay_type, lob_suitability, status, branch_id) VALUES
             ('B-01','Bay 01 - Heavy Commercial','HCV','HCV','AVAILABLE','BR-SEDAM'),
             ('B-02','Bay 02 - General Repair','GENERAL','ALL','AVAILABLE','BR-SEDAM'),
             ('B-03','Bay 03 - EV & Electrical','EV','EV','AVAILABLE','BR-SEDAM'),
             ('B-04','Bay 04 - Express Bay','EXPRESS','MCV_LCV','AVAILABLE','BR-SEDAM'),
             ('B-05','Bay 05 - Washing & Detail','WASH','ALL','AVAILABLE','BR-SEDAM'),
             ('B-99','Bay 99 - Maintenance Blocked','GENERAL','ALL','BLOCKED','BR-SEDAM')`
        );
        console.log('✓ tbl_bays seeded with 6 default bays');
      }
      console.log('✓ tbl_bays');

      // tbl_job_allocations — atomic job/bay/technician allocation record
      // (allocateJobAndBay, floor-execution-engine.ts:327-382).
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS tbl_job_allocations (
          allocation_id     VARCHAR(50) PRIMARY KEY,
          job_card_id       VARCHAR(50) NOT NULL,
          bay_id            VARCHAR(20) NOT NULL,
          technician_id     VARCHAR(50) NOT NULL,
          technician_name   VARCHAR(100) NOT NULL,
          allocated_by      VARCHAR(100) NOT NULL,
          status            VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
          is_override       TINYINT(1) NOT NULL DEFAULT 0,
          override_reason   TEXT NULL,
          branch_id         VARCHAR(50) NOT NULL DEFAULT 'BR-SEDAM',
          created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_alloc_job    (job_card_id),
          INDEX idx_alloc_bay    (bay_id),
          INDEX idx_alloc_tech   (technician_id),
          INDEX idx_alloc_branch (branch_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✓ tbl_job_allocations');

      // tbl_repair_executions — technician work timers (start/pause/resume/
      // complete; floor-execution-engine.ts:387-519, 800-829).
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS tbl_repair_executions (
          execution_id                  VARCHAR(50) PRIMARY KEY,
          job_card_id                   VARCHAR(50) NOT NULL,
          operation_id                  VARCHAR(50) NULL,
          operation_name                VARCHAR(255) NULL,
          technician_id                 VARCHAR(50) NOT NULL,
          technician_name               VARCHAR(100) NULL,
          bay_id                        VARCHAR(20) NULL,
          status                        VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',
          planned_duration_mins         INT NULL,
          started_at                    DATETIME NULL,
          paused_at                     DATETIME NULL,
          accumulated_productive_seconds INT NOT NULL DEFAULT 0,
          accumulated_paused_seconds     INT NOT NULL DEFAULT 0,
          pause_reason                  TEXT NULL,
          completed_at                  DATETIME NULL,
          branch_id                     VARCHAR(50) NOT NULL DEFAULT 'BR-SEDAM',
          created_at                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_exec_job    (job_card_id),
          INDEX idx_exec_tech   (technician_id),
          INDEX idx_exec_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✓ tbl_repair_executions');

      // tbl_qc_handoff — floor-to-QC handoff record + 5-minute QC SLA trigger
      // (handoffToQc, floor-execution-engine.ts:878-929).
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS tbl_qc_handoff (
          handoff_id         VARCHAR(50) PRIMARY KEY,
          job_card_id        VARCHAR(50) NOT NULL,
          vrn                VARCHAR(30) NOT NULL,
          floor_incharge_id  VARCHAR(50) NOT NULL,
          qc_incharge_id     VARCHAR(50) NOT NULL,
          validation_status  VARCHAR(30) NOT NULL DEFAULT 'PASSED',
          status             VARCHAR(30) NOT NULL DEFAULT 'PENDING_QC',
          branch_id          VARCHAR(50) NOT NULL DEFAULT 'BR-SEDAM',
          created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_qch_job    (job_card_id),
          INDEX idx_qch_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✓ tbl_qc_handoff');

      await conn.commit();
      console.log('\n✓ Migration 011 (floor_execution_tables) completed successfully');
    } catch (err: any) {
      await conn.rollback();
      console.error('✗ Migration 011 FAILED — rolled back:', err.message);
      throw err;
    } finally {
      conn.release();
    }
  },
};

export default migration;
