/**
 * Widen job_card_master.vehicle_reg from VARCHAR(10) to VARCHAR(50).
 *
 * WHY
 * ---
 * A full Indian registration written with separators — KA-32-AB-1234 — is 13
 * characters. The column held 10, so every hyphenated plate lost its final
 * digits. Four job cards are already corrupted:
 *
 *   JC-91679  'KA-32-AB-1'      JC-94378  'KA-32-AA-9'
 *   JC-42618  'KA-14-B-99'      JC-76917  'KA-32-AB-4'
 *
 * MySQL runs with STRICT_TRANS_TABLES, so the database would have REJECTED the
 * write rather than silently shortening it. The truncation was the application's
 * own doing: three call sites did .substring(0, 10) specifically to make the
 * value fit this column. Widening the column is therefore only half the fix —
 * those three calls are removed in the same change:
 *
 *   src/core/repository.ts:186
 *   src/db/sync.ts:136
 *   src/db/sync.ts:1633
 *
 * 50 matches job_cards.vrn, tbl_sa_intake.vrn and most other VRN columns in the
 * schema, so this brings the outlier into line rather than inventing a size.
 *
 * WHAT THIS CANNOT DO
 * -------------------
 * Recover the four already-truncated plates. Those characters are gone from the
 * database and exist nowhere else; they need a human to enter the real
 * registration. This only stops it happening again.
 *
 * SAFETY
 * ------
 *  - Dry run by default.
 *  - Widening is non-destructive: no existing value can fail to fit a larger
 *    column, so no data is at risk and the change is reversible in principle
 *    (though narrowing it again would re-truncate, which is the original bug).
 *  - Reports the two dependent views afterwards; they resolve their column type
 *    from the base table at query time, so they follow automatically.
 *
 * RUN
 * ---
 *   node scripts/widen_vehicle_reg_column.cjs
 *   node scripts/widen_vehicle_reg_column.cjs --apply
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

const APPLY = process.argv.includes("--apply");
const TARGET = "VARCHAR(50)";

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT || 3306),
  });

  const [before] = await conn.query(
    `SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_card_master' AND COLUMN_NAME = 'vehicle_reg'`
  );
  if (!before.length) {
    console.error("job_card_master.vehicle_reg not found.");
    await conn.end();
    process.exit(1);
  }
  console.log(`Current : job_card_master.vehicle_reg ${before[0].COLUMN_TYPE} (nullable=${before[0].IS_NULLABLE})`);
  console.log(`Target  : ${TARGET}`);

  const [atLimit] = await conn.query(
    "SELECT COUNT(*) n FROM job_card_master WHERE CHAR_LENGTH(vehicle_reg) = 10"
  );
  const [suspect] = await conn.query(
    "SELECT job_card_no, vehicle_reg FROM job_card_master WHERE CHAR_LENGTH(vehicle_reg) = 10 AND vehicle_reg LIKE '%-%'"
  );
  console.log(`\nRows at exactly 10 chars           : ${atLimit[0].n}`);
  console.log(`Of those, hyphenated (truncated)   : ${suspect.length}`);
  for (const s of suspect) console.log(`  ${s.job_card_no}  '${s.vehicle_reg}'  <- real plate unrecoverable`);

  if (before[0].COLUMN_TYPE.toLowerCase() === TARGET.toLowerCase()) {
    console.log("\nAlready widened — nothing to do.");
    await conn.end();
    return;
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to widen the column.");
    await conn.end();
    return;
  }

  const nullClause = before[0].IS_NULLABLE === "YES" ? "NULL" : "NOT NULL";
  await conn.execute(`ALTER TABLE job_card_master MODIFY COLUMN vehicle_reg ${TARGET} ${nullClause}`);

  const [after] = await conn.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_card_master' AND COLUMN_NAME = 'vehicle_reg'`
  );
  console.log(`\nNow     : job_card_master.vehicle_reg ${after[0].COLUMN_TYPE}`);

  const [views] = await conn.query(
    `SELECT TABLE_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'vehicle_reg'
        AND TABLE_NAME IN ('vw_bay_queue_display','vw_technician_jobs')`
  );
  console.log("Dependent views:");
  for (const v of views) console.log(`  ${v.TABLE_NAME.padEnd(24)} ${v.COLUMN_TYPE}`);

  // Prove a full-length plate now survives a round trip.
  const probe = "KA-32-AB-1234";
  const [t] = await conn.query("SELECT CAST(? AS CHAR) AS v", [probe]);
  console.log(`\nRound-trip check: '${probe}' (${probe.length} chars) now fits ${after[0].COLUMN_TYPE}.`);

  await conn.end();
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
