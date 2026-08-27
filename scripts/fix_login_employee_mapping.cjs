/**
 * One-off production data fix: correct two mis-mapped login accounts.
 *
 * WHY
 * ---
 * `sayeed_dp` and `wmsdmworkshop@gmail.com` both carry employee_id = 42, which
 * is MD MOBIN (DEV-325, Technician). That is why "My Profile" rendered another
 * employee's Aadhaar, PAN, HDFC account number and ₹13,000 salary to whoever
 * logged in on those accounts.
 *
 * The real record for this user is employee_id 60 — A SAYEED JAFFER (DEV-205,
 * General Manager), active and currently linked to no login.
 *
 * WHAT IT DOES
 * ------------
 *   user_access_master  user_id 21  employee_id 42 -> 60
 *   user_access_master  user_id 48  employee_id 42 -> NULL
 *   users               sayeed_dp                42 -> 60
 *   users               wmsdmworkshop@gmail.com  42 -> NULL
 *
 * The second account is unlinked rather than repointed because the system
 * enforces one employee per active login, and employee 60 can only back one.
 * Both tables are updated because the app keeps them in sync (see the
 * PUT /api/users/:user_id handler).
 *
 * SAFETY
 * ------
 *  - Runs in a single transaction.
 *  - Refuses to run unless employee 60 exists, is active, and is unclaimed.
 *  - Every UPDATE is guarded on the CURRENT value (employee_id = 42), so a
 *    second run is a no-op rather than a corruption.
 *  - Rolls back unless all four statements affect exactly one row.
 *  - Touches no other account, and creates or deletes nothing.
 *
 * RUN
 * ---
 *   node scripts/fix_login_employee_mapping.cjs           # dry run, prints plan
 *   node scripts/fix_login_employee_mapping.cjs --apply   # performs the fix
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

const APPLY = process.argv.includes("--apply");

const TARGET_EMP = 60;
const WRONG_EMP = 42;

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT || 3306),
  });

  const [before] = await conn.query(
    `SELECT u.user_id, u.username, u.employee_id, e.employee_code, e.full_name AS emp_name
       FROM user_access_master u
       LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE u.user_id IN (21, 48)`
  );
  console.log("BEFORE:");
  console.table(before);

  if (!APPLY) {
    console.log(
      `\nDry run. Would set user 21 -> employee ${TARGET_EMP}, and unlink user 48.` +
        `\nRe-run with --apply to perform the change.`
    );
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    const [emp] = await conn.query(
      "SELECT employee_id, full_name, is_active FROM employees WHERE employee_id = ?",
      [TARGET_EMP]
    );
    if (!emp.length) throw new Error(`Employee ${TARGET_EMP} does not exist`);
    if (!emp[0].is_active) throw new Error(`Employee ${TARGET_EMP} is inactive`);

    const [claimed] = await conn.query(
      "SELECT username FROM user_access_master WHERE employee_id = ? AND user_id <> 21",
      [TARGET_EMP]
    );
    if (claimed.length) {
      throw new Error(`Employee ${TARGET_EMP} is already linked to @${claimed[0].username}`);
    }

    const results = [];
    results.push(
      await conn.execute(
        "UPDATE user_access_master SET employee_id = ? WHERE user_id = 21 AND employee_id = ?",
        [TARGET_EMP, WRONG_EMP]
      )
    );
    results.push(
      await conn.execute(
        "UPDATE user_access_master SET employee_id = NULL WHERE user_id = 48 AND employee_id = ?",
        [WRONG_EMP]
      )
    );
    results.push(
      await conn.execute(
        "UPDATE users SET employee_id = ? WHERE username = 'sayeed_dp' AND employee_id = ?",
        [TARGET_EMP, WRONG_EMP]
      )
    );
    results.push(
      await conn.execute(
        "UPDATE users SET employee_id = NULL WHERE username = 'wmsdmworkshop@gmail.com' AND employee_id = ?",
        [WRONG_EMP]
      )
    );

    const affected = results.map((r) => r[0].affectedRows);
    console.log(
      "\naffectedRows [uam:21, uam:48, users:sayeed_dp, users:wmsdmworkshop]:",
      affected.join(", ")
    );
    if (affected.some((n) => n !== 1)) {
      throw new Error("Expected exactly 1 row per statement — rolling back");
    }

    await conn.commit();
    console.log("COMMITTED.\n");
  } catch (err) {
    await conn.rollback();
    console.error("ROLLED BACK:", err.message);
    await conn.end();
    process.exit(1);
  }

  const [after] = await conn.query(
    `SELECT u.user_id, u.username, u.employee_id, e.employee_code, e.full_name AS emp_name
       FROM user_access_master u
       LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE u.user_id IN (21, 48)`
  );
  console.log("AFTER (user_access_master):");
  console.table(after);

  const [afterUsers] = await conn.query(
    "SELECT username, employee_id FROM users WHERE username IN ('sayeed_dp','wmsdmworkshop@gmail.com')"
  );
  console.log("AFTER (users):");
  console.table(afterUsers);

  await conn.end();
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
