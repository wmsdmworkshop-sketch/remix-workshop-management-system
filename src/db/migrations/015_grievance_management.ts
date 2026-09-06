/**
 * Migration 015 — Grievance Management
 *
 * New HR module (nav restructuring plan). Zero prior infrastructure existed
 * for this anywhere in the codebase.
 *
 * Sensitive data: the filer sees only their own records (JWT-scoped, same
 * "no client id trusted" pattern as /api/my/*), HR/admin see everything.
 * Deliberately NOT visible to general managers.
 *
 * Idempotent (CREATE TABLE IF NOT EXISTS). No destructive operations.
 */

import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

const migration: Migration = {
  version: 15,
  name: "grievance_management",
  up: async (pool: typeof db) => {
    const conn = await (pool as any).getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS tbl_grievances (
          grievance_id      VARCHAR(50) PRIMARY KEY,
          employee_id       INT NOT NULL,
          category          VARCHAR(100) NOT NULL,
          description       TEXT NOT NULL,
          status            VARCHAR(20) NOT NULL DEFAULT 'OPEN',
          filed_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          resolved_by       VARCHAR(100) NULL,
          resolution_notes  TEXT NULL,
          resolved_at       DATETIME NULL,
          INDEX idx_grievance_employee (employee_id),
          INDEX idx_grievance_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✓ tbl_grievances');

      await conn.commit();
      console.log('\n✓ Migration 015 (grievance_management) completed successfully');
    } catch (err: any) {
      await conn.rollback();
      console.error('✗ Migration 015 FAILED — rolled back:', err.message);
      throw err;
    } finally {
      conn.release();
    }
  },
};

export default migration;
