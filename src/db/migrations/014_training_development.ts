/**
 * Migration 014 — Training & Development
 *
 * New HR module (nav restructuring plan). employees.lms_id already exists as
 * an external Learning Management System reference (EmployeeDirectory.tsx),
 * but there is no in-app tracking of what training an employee has actually
 * done — this table is simple internal tracking, not a full LMS replacement,
 * and does not touch lms_id.
 *
 * Idempotent (CREATE TABLE IF NOT EXISTS). No destructive operations.
 */

import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

const migration: Migration = {
  version: 14,
  name: "training_development",
  up: async (pool: typeof db) => {
    const conn = await (pool as any).getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS tbl_training_records (
          record_id        VARCHAR(50) PRIMARY KEY,
          employee_id      INT NOT NULL,
          course_name      VARCHAR(200) NOT NULL,
          status           VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
          completed_date   DATE NULL,
          certificate_ref  VARCHAR(150) NULL,
          created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_training_employee (employee_id),
          INDEX idx_training_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✓ tbl_training_records');

      await conn.commit();
      console.log('\n✓ Migration 014 (training_development) completed successfully');
    } catch (err: any) {
      await conn.rollback();
      console.error('✗ Migration 014 FAILED — rolled back:', err.message);
      throw err;
    } finally {
      conn.release();
    }
  },
};

export default migration;
