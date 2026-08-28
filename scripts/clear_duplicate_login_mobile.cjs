/**
 * One-off data fix: clear a duplicated mobile from the login that does not own it.
 *
 * WHY
 * ---
 * Two active logins both carry mobile_no 9743952087:
 *
 *   @mallu_st  user_id 24   "mallinath"   employee_id = 0   (dangling, no employee row)
 *   @dev-227   user_id 59   "MALLINATH"   employee_id = 13  -> DEV-227 "MALLINATH"
 *
 * This is NOT two people sharing a number. It is ONE person — MALLINATH — with
 * two login accounts. The employee record DEV-227 carries mobile 9743952087, and
 * @dev-227 is the login properly linked to it. @mallu_st is an orphaned duplicate
 * whose employee_id points at 0, a row that does not exist.
 *
 * The duplication matters because mobile_no is the password-reset lookup key and
 * the reset endpoint takes rows[0]:
 *
 *   SELECT * FROM user_access_master WHERE mobile_no = ?
 *
 * so a reset request on that number targets whichever row MySQL returns first —
 * possibly the orphan rather than the real account.
 *
 * WHAT IT DOES
 * ------------
 * Clears mobile_no on @mallu_st only, in both user_access_master and users.
 * @dev-227 keeps the number, because the employee record it is linked to is the
 * one that actually carries it. Nothing is deleted and no account is disabled.
 *
 * SAFETY
 * ------
 *  - Dry run by default.
 *  - Single transaction.
 *  - Refuses to run unless the ownership evidence still holds: employee 13 must
 *    exist, be active, and carry this exact number, and @dev-227 must be the
 *    login linked to it. If the data has moved on, it aborts rather than guessing.
 *  - Guarded on the current value, so re-running is a no-op.
 *
 * NOTE
 * ----
 * @mallu_st remains an orphaned duplicate account with a dangling employee_id.
 * Whether to deactivate or merge it is a separate decision and is NOT done here.
 *
 * RUN
 * ---
 *   node scripts/clear_duplicate_login_mobile.cjs           # dry run
 *   node scripts/clear_duplicate_login_mobile.cjs --apply   # perform
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

const APPLY = process.argv.includes("--apply");

const NUMBER = "9743952087";
const ORPHAN_USER_ID = 24;        // @mallu_st  — loses the number
const ORPHAN_USERNAME = "mallu_st";
const OWNER_USER_ID = 59;         // @dev-227   — keeps it
const OWNER_EMPLOYEE_ID = 13;     // DEV-227 MALLINATH

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT || 3306),
  });

  const [before] = await conn.query(
    `SELECT u.user_id, u.username, u.full_name, u.mobile_no, u.employee_id,
            e.employee_code, e.mobile AS employee_mobile
       FROM user_access_master u
       LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE u.mobile_no = ?`,
    [NUMBER]
  );
  console.log(`BEFORE — logins carrying ${NUMBER}:`);
  console.table(before);

  if (before.length < 2) {
    console.log("\nNothing to do — the number is no longer duplicated.");
    await conn.end();
    return;
  }

  if (!APPLY) {
    console.log(
      `\nDry run. Would clear mobile_no on @${ORPHAN_USERNAME} (user_id ${ORPHAN_USER_ID}) ` +
        `and leave @dev-227 (user_id ${OWNER_USER_ID}) holding it.` +
        `\nRe-run with --apply to perform the change.`
    );
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    // Ownership evidence must still hold before we touch anything.
    const [emp] = await conn.query(
      "SELECT employee_id, employee_code, full_name, mobile, is_active FROM employees WHERE employee_id = ?",
      [OWNER_EMPLOYEE_ID]
    );
    if (!emp.length) throw new Error(`Employee ${OWNER_EMPLOYEE_ID} no longer exists`);
    if (!emp[0].is_active) throw new Error(`Employee ${OWNER_EMPLOYEE_ID} is inactive`);
    if (String(emp[0].mobile).replace(/\D/g, "") !== NUMBER) {
      throw new Error(
        `Employee ${OWNER_EMPLOYEE_ID} no longer carries ${NUMBER} (has '${emp[0].mobile}') — ownership unclear, aborting`
      );
    }

    const [owner] = await conn.query(
      "SELECT user_id, username, employee_id FROM user_access_master WHERE user_id = ?",
      [OWNER_USER_ID]
    );
    if (!owner.length || Number(owner[0].employee_id) !== OWNER_EMPLOYEE_ID) {
      throw new Error(`@dev-227 is no longer linked to employee ${OWNER_EMPLOYEE_ID} — aborting`);
    }

    const r1 = await conn.execute(
      "UPDATE user_access_master SET mobile_no = '' WHERE user_id = ? AND mobile_no = ?",
      [ORPHAN_USER_ID, NUMBER]
    );
    const r2 = await conn.execute(
      "UPDATE users SET mobile_no = '' WHERE username = ? AND mobile_no = ?",
      [ORPHAN_USERNAME, NUMBER]
    );

    const affected = [r1[0].affectedRows, r2[0].affectedRows];
    console.log(`\naffectedRows [user_access_master, users]: ${affected.join(", ")}`);
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
    `SELECT user_id, username, full_name, mobile_no, employee_id
       FROM user_access_master WHERE user_id IN (?, ?)`,
    [ORPHAN_USER_ID, OWNER_USER_ID]
  );
  console.log("AFTER:");
  console.table(after);

  const [dupes] = await conn.query(
    `SELECT mobile_no, COUNT(*) n, GROUP_CONCAT(username) users
       FROM user_access_master
      WHERE mobile_no <> '' AND mobile_no IS NOT NULL
      GROUP BY mobile_no HAVING n > 1`
  );
  console.log("\nRemaining duplicated mobile numbers across logins:");
  console.log(dupes.length ? JSON.stringify(dupes, null, 1) : "  (none)");

  await conn.end();
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
