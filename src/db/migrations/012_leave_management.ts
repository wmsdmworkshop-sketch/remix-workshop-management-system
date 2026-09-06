/**
 * Migration 012 — Leave Management
 *
 * New HR module (nav restructuring plan). No prior table exists for leave
 * requests — "Leave" today is only one of four ad-hoc day-status values
 * inside AttendanceShiftLog.tsx, not a real request/approval workflow.
 *
 * Modeled on the same request → approve/reject state machine already proven
 * in OvertimeEmployeeDashboard.tsx, not a new pattern.
 *
 * Idempotent (CREATE TABLE IF NOT EXISTS). No destructive operations.
 */

import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

const migration: Migration = {
  version: 12,
  name: "leave_management",
  up: async (pool: typeof db) => {
    const conn = await (pool as any).getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS tbl_leave_requests (
          leave_id      VARCHAR(50) PRIMARY KEY,
          employee_id   INT NOT NULL,
          leave_type    VARCHAR(50) NOT NULL,
          start_date    DATE NOT NULL,
          end_date      DATE NOT NULL,
          reason        TEXT NULL,
          status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          approved_by   VARCHAR(100) NULL,
          decided_at    DATETIME NULL,
          created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_leave_employee (employee_id),
          INDEX idx_leave_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✓ tbl_leave_requests');

      await conn.commit();
      console.log('\n✓ Migration 012 (leave_management) completed successfully');
    } catch (err: any) {
      await conn.rollback();
      console.error('✗ Migration 012 FAILED — rolled back:', err.message);
      throw err;
    } finally {
      conn.release();
    }
  },
};

export default migration;
