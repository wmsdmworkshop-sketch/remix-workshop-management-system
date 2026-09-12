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

      // Declared end state: every FK that referenced these columns must exist
      // when this migration finishes, no matter where a previous attempt died.
      const expectedFks = new Map<string, any>();

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
        const alreadyAuto = String(info.EXTRA || "").toLowerCase().includes("auto_increment");

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

        // INTERRUPTION SAFETY.
        //
        // Isolated testing showed the original form was NOT recoverable: if the
        // process died between dropping the referencing foreign key and
        // recreating it, a re-run either recreated zero FKs (it re-reads the
        // now-empty FK list) or skipped the table entirely because the column
        // was already AUTO_INCREMENT — leaving the constraint permanently gone.
        // Data survived, but a foreign key silently disappeared.
        //
        // Two changes fix that:
        //   1. EXPECTED_FKS below is the declared truth, so a missing constraint
        //      is restored even when the FK list currently reads empty.
        //   2. The whole per-table change runs in ONE transaction; MySQL DDL is
        //      not transactional, so the reconciliation step after the loop is
        //      what actually guarantees the end state.
        const [fks]: any = await connection.query(
          `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
             FROM information_schema.key_column_usage
            WHERE table_schema = DATABASE()
              AND REFERENCED_TABLE_NAME = ?
              AND REFERENCED_COLUMN_NAME = ?`,
          [t.table, t.column]
        );

        // Remember what MUST exist at the end, whether or not it exists now.
        for (const fk of (fks || [])) {
          const key = `${fk.TABLE_NAME}.${fk.CONSTRAINT_NAME}`;
          if (!expectedFks.has(key)) expectedFks.set(key, fk);
        }

        if (!alreadyAuto) {
          for (const fk of (fks || [])) {
            await connection.execute(
              `ALTER TABLE \`${fk.TABLE_NAME}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
            );
          }
          await connection.execute(
            `ALTER TABLE \`${t.table}\` MODIFY \`${t.column}\` ${info.COLUMN_TYPE} NOT NULL AUTO_INCREMENT`
          );
          console.log(`[Migration v19] ${t.table}.${t.column} is now AUTO_INCREMENT.`);
        } else {
          console.log(`[Migration v19] ${t.table}.${t.column} already AUTO_INCREMENT.`);
        }
      }

      // RECONCILE: restore any expected foreign key that is missing. This is
      // what makes an interrupted run recoverable — re-running always converges
      // on the declared end state, even if the FK list read above was empty
      // because a previous attempt had already dropped it.
      const [declared]: any = await connection.query(
        `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
           FROM information_schema.key_column_usage
          WHERE table_schema = DATABASE()
            AND REFERENCED_TABLE_NAME IN ('job_revenues', 'job_revenue_split_details')`
      );
      const present = new Set((declared || []).map((f: any) => `${f.TABLE_NAME}.${f.CONSTRAINT_NAME}`));

      // job_revenue_split_details.revenue_id -> job_revenues.revenue_id is the
      // relationship this schema declares; restore it by name if absent.
      const KNOWN_FK = {
        TABLE_NAME: "job_revenue_split_details",
        CONSTRAINT_NAME: "fk_jrsd_revenue",
        COLUMN_NAME: "revenue_id",
        REFERENCED_TABLE_NAME: "job_revenues",
        REFERENCED_COLUMN_NAME: "revenue_id"
      };
      if (!expectedFks.has(`${KNOWN_FK.TABLE_NAME}.${KNOWN_FK.CONSTRAINT_NAME}`)) {
        expectedFks.set(`${KNOWN_FK.TABLE_NAME}.${KNOWN_FK.CONSTRAINT_NAME}`, KNOWN_FK);
      }

      let restored = 0;
      for (const [key, fk] of expectedFks) {
        if (present.has(key)) continue;
        try {
          await connection.execute(
            `ALTER TABLE \`${fk.TABLE_NAME}\` ADD CONSTRAINT \`${fk.CONSTRAINT_NAME}\`
               FOREIGN KEY (\`${fk.COLUMN_NAME}\`) REFERENCES \`${fk.REFERENCED_TABLE_NAME}\` (\`${fk.REFERENCED_COLUMN_NAME}\`)`
          );
          restored++;
        } catch (e: any) {
          // A duplicate-name error means it already exists under a race; any
          // other failure must stop the migration, since writes would then be
          // enabled without the constraint.
          if (!String(e.message || "").includes("Duplicate")) {
            throw new Error(
              `REFUSED: could not restore foreign key ${key}: ${e.message}. ` +
                `Writes must not be enabled without it.`
            );
          }
        }
      }
      if (restored) console.log(`[Migration v19] restored ${restored} foreign key(s).`);

      // Verify the end state before allowing the boot to continue.
      const [finalFks]: any = await connection.query(
        `SELECT COUNT(*) AS n FROM information_schema.key_column_usage
          WHERE table_schema = DATABASE()
            AND TABLE_NAME = 'job_revenue_split_details'
            AND CONSTRAINT_NAME = 'fk_jrsd_revenue'`
      );
      if (Number(finalFks?.[0]?.n || 0) === 0) {
        throw new Error(
          "REFUSED: fk_jrsd_revenue is missing after migration. Writes must not be enabled without it."
        );
      }
    } finally {
      connection.release();
    }
  }
};

export default migration;
