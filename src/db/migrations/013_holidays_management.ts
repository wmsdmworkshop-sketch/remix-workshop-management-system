/**
 * Migration 013 — Holidays Management
 *
 * New HR module (nav restructuring plan). No prior holiday-calendar table
 * exists — only incidental string literals ("Absentism due to leave/Holiday",
 * an overtime shift-type dropdown option) reference the word "holiday"
 * anywhere in the codebase; no real calendar/master data.
 *
 * Idempotent (CREATE TABLE IF NOT EXISTS). No destructive operations.
 */

import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

const migration: Migration = {
  version: 13,
  name: "holidays_management",
  up: async (pool: typeof db) => {
    const conn = await (pool as any).getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS tbl_holidays (
          holiday_id    INT AUTO_INCREMENT PRIMARY KEY,
          holiday_date  DATE NOT NULL,
          name          VARCHAR(150) NOT NULL,
          is_optional   TINYINT(1) NOT NULL DEFAULT 0,
          created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_holiday_date_name (holiday_date, name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✓ tbl_holidays');

      await conn.commit();
      console.log('\n✓ Migration 013 (holidays_management) completed successfully');
    } catch (err: any) {
      await conn.rollback();
      console.error('✗ Migration 013 FAILED — rolled back:', err.message);
      throw err;
    } finally {
      conn.release();
    }
  },
};

export default migration;
