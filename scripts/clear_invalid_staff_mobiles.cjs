/**
 * One-off data cleanup: blank staff mobile numbers that are not valid.
 *
 * WHY
 * ---
 * Two employee records carry numbers that are not real phone numbers:
 *
 *   MUSTAFA       EMP022   +9198765186525
 *   REVANSIDAPPA  DEV-352  +9198765341681
 *
 * Both are +91 followed by ELEVEN digits. They were not typed by anyone — the
 * CSV bulk import in EmployeeDirectory.tsx generated them:
 *
 *     const mobileNum = `+9198765${Math.floor(100000 + Math.random() * 900000)}`;
 *
 * so there is no real number behind them to recover. The generator has been
 * removed; this clears what it already wrote.
 *
 * Leaving them is not neutral. mobile_no is the lookup key for password reset
 * (`SELECT * FROM user_access_master WHERE mobile_no = ?`), so a fabricated
 * number is a fabricated account-recovery route. Blank fails safe: the reset
 * endpoint rejects falsy input, so those accounts simply cannot use SMS reset
 * until a real number is entered.
 *
 * WHAT IT DOES
 * ------------
 * Across employees.mobile, employees.alt_mobile, user_access_master.mobile_no
 * and users.mobile_no, sets to blank/NULL any value that does not normalise to
 * a valid 10-digit Indian mobile. A +91 country code or leading trunk 0 is
 * stripped first, because those are unambiguous — only genuinely unusable
 * values are cleared, and a recoverable one is REWRITTEN to its clean form
 * rather than discarded.
 *
 * SAFETY
 * ------
 *  - Dry run by default; prints every row it would touch.
 *  - Single transaction; rolls back on any error.
 *  - Only ever writes a normalised value or a blank. Never invents digits.
 *  - Re-running is a no-op once the data is clean.
 *
 * RUN
 * ---
 *   node scripts/clear_invalid_staff_mobiles.cjs           # dry run
 *   node scripts/clear_invalid_staff_mobiles.cjs --apply   # perform
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

const APPLY = process.argv.includes("--apply");
const MOBILE_RULE = /^[6-9]\d{9}$/;

/** Returns the clean 10-digit number, or "" when the value is unusable. */
function normalise(raw) {
  const original = String(raw ?? "").trim();
  if (!original) return "";
  let digits = original.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return MOBILE_RULE.test(digits) ? digits : "";
}

const TARGETS = [
  { table: "employees", key: "employee_id", col: "mobile", blank: "" },
  { table: "employees", key: "employee_id", col: "alt_mobile", blank: null },
  { table: "user_access_master", key: "user_id", col: "mobile_no", blank: "" },
  { table: "users", key: "user_id", col: "mobile_no", blank: "" },
];

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT || 3306),
  });

  const plan = [];

  for (const t of TARGETS) {
    const [rows] = await conn.query(
      `SELECT \`${t.key}\` AS id, \`${t.col}\` AS val FROM \`${t.table}\`
        WHERE \`${t.col}\` IS NOT NULL AND \`${t.col}\` <> ''`
    );
    for (const r of rows) {
      const clean = normalise(r.val);
      if (clean === String(r.val)) continue; // already clean
      plan.push({
        table: t.table,
        key: t.key,
        col: t.col,
        id: r.id,
        from: r.val,
        to: clean === "" ? t.blank : clean,
        action: clean === "" ? "CLEAR" : "NORMALISE",
      });
    }
  }

  if (plan.length === 0) {
    console.log("Nothing to do — every stored mobile is already a clean 10-digit number.");
    await conn.end();
    return;
  }

  console.log(`${plan.length} value(s) to change:\n`);
  console.table(
    plan.map((p) => ({
      table: p.table,
      id: p.id,
      column: p.col,
      from: p.from,
      to: p.to === null ? "NULL" : `'${p.to}'`,
      action: p.action,
    }))
  );

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to perform these changes.");
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    let changed = 0;
    for (const p of plan) {
      const [res] = await conn.execute(
        `UPDATE \`${p.table}\` SET \`${p.col}\` = ? WHERE \`${p.key}\` = ?`,
        [p.to, p.id]
      );
      changed += res.affectedRows;
    }
    await conn.commit();
    console.log(`\nCOMMITTED. ${changed} row update(s) applied.`);
  } catch (err) {
    await conn.rollback();
    console.error("ROLLED BACK:", err.message);
    await conn.end();
    process.exit(1);
  }

  // Verify nothing unusable remains.
  let remaining = 0;
  for (const t of TARGETS) {
    const [rows] = await conn.query(
      `SELECT \`${t.col}\` AS val FROM \`${t.table}\`
        WHERE \`${t.col}\` IS NOT NULL AND \`${t.col}\` <> ''`
    );
    remaining += rows.filter((r) => normalise(r.val) !== String(r.val)).length;
  }
  console.log(
    remaining === 0
      ? "VERIFIED: every remaining stored mobile is a clean 10-digit number."
      : `WARNING: ${remaining} value(s) still do not normalise cleanly.`
  );

  await conn.end();
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
