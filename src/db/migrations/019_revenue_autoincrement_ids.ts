import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * Database-assigned identifiers for revenue and allocation details.
 *
 * WHY THIS IS REQUIRED
 *
 * Migration 018 added UNIQUE(job_id), but that alone does not stop one job's
 * revenue being destroyed by another. Proven empirically against a table with
 * both keys:
 *
 *   existing:  (revenue_id=2, job_id=9002, labour=7777)
 *   incoming:  INSERT ... VALUES (2, 9003, 5000)
 *              ON DUPLICATE KEY UPDATE job_id=VALUES(job_id), ...
 *   result:    (revenue_id=2, job_id=9003, labour=5000)
 *
 * Job 9002's revenue was silently overwritten. The PRIMARY KEY matched first,
 * and the update rewrote job_id itself. Two instances can compute the same
 * numeric id for DIFFERENT jobs whenever their baselines differ — reachable at
 * maxScale 3, and not exercised by a test where every instance reads the same
 * snapshot.
 *
 * The cure is to stop computing surrogate ids in application memory at all.
 * With AUTO_INCREMENT the database allocates them, so two writers can never
 * choose the same id for different rows, and a competing insert for a job that
 * already has revenue is REJECTED by UNIQUE(job_id) rather than overwriting it.
 *
 * NOTE ON DIVERGENCE: sync.ts's CREATE TABLE already declares AUTO_INCREMENT on
 * both columns, but the production tables do not have it — verified against a
 * structure-only export. Fresh databases created by the app therefore already
 * behave correctly; the existing production tables need this migration.
 *
 * SAFETY
 *
 * MODIFY ... AUTO_INCREMENT changes the column definition only. No row is
 * deleted, no value is rewritten, and existing identifiers are preserved —
 * MySQL sets the next auto-value above the current maximum. The migration
 * refuses if a non-positive identifier exists, since AUTO_INCREMENT cannot
 * represent those.
 */
const migration: Migration = {
  version: 19,
  name: "revenue_autoincrement_ids",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      const targets: Array<{ table: string; column: string }> = [
        { table: "job_revenues", column: "revenue_id" },
        { table: "job_revenue_split_details", column: "detail_id" }
      ];

      for (const t of targets) {
        const [colRows]: any = await connection.query(
          `SELECT EXTRA, COLUMN_TYPE FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
          [t.table, t.column]
        );
        const info = colRows?.[0];
        if (!info) {
          throw new Error(`REFUSED: ${t.table}.${t.column} not found.`);
        }
        if (String(info.EXTRA || "").toLowerCase().includes("auto_increment")) {
          console.log(`[Migration v19] ${t.table}.${t.column} already AUTO_INCREMENT — skipping.`);
          continue;
        }

        // AUTO_INCREMENT cannot represent 0 or negative identifiers.
        const [bad]: any = await connection.query(
          `SELECT COUNT(*) AS n FROM \`${t.table}\` WHERE \`${t.column}\` <= 0`
        );
        if (Number(bad?.[0]?.n || 0) > 0) {
          throw new Error(
            `REFUSED: ${t.table} contains ${bad[0].n} row(s) with ${t.column} <= 0. ` +
              `AUTO_INCREMENT cannot represent those; resolve them first. Nothing was changed.`
          );
        }

        // A column referenced by a foreign key cannot be MODIFYed while the
        // constraint exists. Drop the referencing FKs, change the column, then
        // recreate them exactly as they were. Discovered in isolated testing:
        // job_revenue_split_details.fk_jrsd_revenue references
        // job_revenues.revenue_id.
        const [fks]: any = await connection.query(
          `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
             FROM information_schema.key_column_usage
            WHERE table_schema = DATABASE()
              AND REFERENCED_TABLE_NAME = ?
              AND REFERENCED_COLUMN_NAME = ?`,
          [t.table, t.column]
        );

        for (const fk of (fks || [])) {
          await connection.execute(
            `ALTER TABLE \`${fk.TABLE_NAME}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
          );
        }

        await connection.execute(
          `ALTER TABLE \`${t.table}\` MODIFY \`${t.column}\` ${info.COLUMN_TYPE} NOT NULL AUTO_INCREMENT`
        );

        for (const fk of (fks || [])) {
          await connection.execute(
            `ALTER TABLE \`${fk.TABLE_NAME}\` ADD CONSTRAINT \`${fk.CONSTRAINT_NAME}\`
               FOREIGN KEY (\`${fk.COLUMN_NAME}\`) REFERENCES \`${fk.REFERENCED_TABLE_NAME}\` (\`${fk.REFERENCED_COLUMN_NAME}\`)`
          );
        }

        console.log(
          `[Migration v19] ${t.table}.${t.column} is now AUTO_INCREMENT` +
            ((fks || []).length ? ` (${fks.length} foreign key(s) dropped and recreated).` : ".")
        );
      }
    } finally {
      connection.release();
    }
  }
};

export default migration;
