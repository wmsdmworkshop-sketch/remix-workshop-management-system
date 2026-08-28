/**
 * Set real mobile numbers for the two employees whose records were blanked.
 *
 * Their previous values were never real numbers — the CSV bulk import used to
 * fabricate them as `+9198765${random 6 digits}`, which is +91 followed by
 * eleven digits. Those were cleared by clear_invalid_staff_mobiles.cjs rather
 * than truncated into something plausible, because mobile_no is the
 * password-reset lookup key and a guessed number is a guessed recovery route.
 *
 * These are the operator-supplied real numbers:
 *
 *   DEV-325  MD MOBIN       8105088247
 *   DEV-352  REVANSIDAPPA   7899999127
 *
 * Both are validated against the SAME rule the server enforces
 * (normaliseStaffMobile / validateMobileInput): a +91 prefix or leading trunk 0
 * is stripped, and the result must match ^[6-9]\d{9}$. Anything else aborts.
 *
 * The number is written to employees.mobile and propagated to
 * user_access_master.mobile_no and users.mobile_no for any linked login, so the
 * three tables cannot drift apart — the drift that produced this mess.
 *
 * SAFETY
 * ------
 *  - Dry run by default.
 *  - Single transaction.
 *  - Validates every number BEFORE writing anything.
 *  - Refuses if a number is already held by a DIFFERENT employee or login,
 *    since a shared mobile makes password reset ambiguous (the endpoint takes
 *    rows[0]).
 *
 * RUN
 * ---
 *   node scripts/set_employee_mobiles.cjs           # dry run
 *   node scripts/set_employee_mobiles.cjs --apply
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

const APPLY = process.argv.includes("--apply");

const ASSIGNMENTS = [
  { employee_code: "DEV-325", expect_name: "MD MOBIN", mobile: "8105088247" },
  { employee_code: "DEV-352", expect_name: "REVANSIDAPPA", mobile: "7899999127" },
];

/** Mirrors the server's normaliseStaffMobile exactly. */
function normalise(raw) {
  const original = String(raw ?? "").trim();
  if (!original) return "";
  let d = original.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : "";
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT || 3306),
  });

  const plan = [];
  for (const a of ASSIGNMENTS) {
    const clean = normalise(a.mobile);
    if (!clean) {
      console.error(`REJECTED: '${a.mobile}' for ${a.employee_code} is not a valid 10-digit Indian mobile.`);
      await conn.end();
      process.exit(1);
    }

    const [emp] = await conn.query(
      "SELECT employee_id, employee_code, full_name, mobile, is_active FROM employees WHERE employee_code = ?",
      [a.employee_code]
    );
    if (!emp.length) {
      console.error(`REJECTED: employee ${a.employee_code} not found.`);
      await conn.end();
      process.exit(1);
    }
    if (emp[0].full_name.toUpperCase() !== a.expect_name.toUpperCase()) {
      console.error(
        `REJECTED: ${a.employee_code} is '${emp[0].full_name}', expected '${a.expect_name}'. Aborting rather than writing to the wrong person.`
      );
      await conn.end();
      process.exit(1);
    }

    // A number already on someone else makes password reset ambiguous.
    const [clashEmp] = await conn.query(
      "SELECT employee_code, full_name FROM employees WHERE mobile = ? AND employee_id <> ?",
      [clean, emp[0].employee_id]
    );
    const [clashUser] = await conn.query(
      "SELECT username FROM user_access_master WHERE mobile_no = ? AND (employee_id IS NULL OR employee_id <> ?)",
      [clean, emp[0].employee_id]
    );
    if (clashEmp.length || clashUser.length) {
      console.error(
        `REJECTED: ${clean} is already held by ` +
          [...clashEmp.map((e) => `${e.employee_code} ${e.full_name}`), ...clashUser.map((u) => "@" + u.username)].join(", ")
      );
      await conn.end();
      process.exit(1);
    }

    const [login] = await conn.query(
      "SELECT username FROM user_access_master WHERE employee_id = ?",
      [emp[0].employee_id]
    );

    plan.push({
      employee_id: emp[0].employee_id,
      employee_code: emp[0].employee_code,
      full_name: emp[0].full_name,
      from: emp[0].mobile === null ? "NULL" : emp[0].mobile === "" ? "(blank)" : emp[0].mobile,
      to: clean,
      login: login.length ? login[0].username : null,
    });
  }

  console.log("Planned changes:");
  console.table(plan);

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write these numbers.");
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    for (const p of plan) {
      const [r1] = await conn.execute("UPDATE employees SET mobile = ? WHERE employee_id = ?", [
        p.to,
        p.employee_id,
      ]);
      if (r1.affectedRows !== 1) throw new Error(`employees update for ${p.employee_code} affected ${r1.affectedRows} rows`);

      // Keep the login tables in step so the three sources cannot drift.
      await conn.execute("UPDATE user_access_master SET mobile_no = ? WHERE employee_id = ?", [
        p.to,
        p.employee_id,
      ]);
      await conn.execute("UPDATE users SET mobile_no = ? WHERE employee_id = ?", [p.to, p.employee_id]);
    }
    await conn.commit();
    console.log("\nCOMMITTED.\n");
  } catch (err) {
    await conn.rollback();
    console.error("ROLLED BACK:", err.message);
    await conn.end();
    process.exit(1);
  }

  const [after] = await conn.query(
    `SELECT e.employee_code, e.full_name, e.mobile AS employee_mobile,
            u.username, u.mobile_no AS login_mobile
       FROM employees e
       LEFT JOIN user_access_master u ON u.employee_id = e.employee_id
      WHERE e.employee_code IN (?, ?)`,
    ASSIGNMENTS.map((a) => a.employee_code)
  );
  console.log("AFTER:");
  console.table(after);

  const [bad] = await conn.query(
    "SELECT employee_code, full_name, mobile FROM employees WHERE is_active = 1 AND (mobile = '' OR mobile IS NULL)"
  );
  console.log(
    bad.length === 0
      ? "Every active employee now has a mobile on record."
      : `Active employees still without a mobile: ${bad.map((b) => b.employee_code).join(", ")}`
  );

  await conn.end();
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
