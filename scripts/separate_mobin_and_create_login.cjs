/**
 * Separate MD MOBIN's identity from the owner's, and give him his own login.
 *
 * STATE FOUND
 * -----------
 * The login mapping itself is already correct — @sayeed_dp now points at
 * employee 60 (A SAYEED JAFFER, DEV-205), and @wmsdmworkshop@gmail.com is
 * unlinked. What is still entangled is MOBIN's EMPLOYEE record:
 *
 *   employee 42  MD MOBIN         DEV-325  mobile 9606453845  email wmsdmworkshop@gmail.com
 *   employee 60  A SAYEED JAFFER  DEV-205  mobile 9606453845  email NULL
 *
 * Both the mobile and the email on MOBIN's record belong to the owner, not to
 * MOBIN. Creating his login while that stands would carry the contamination
 * into a brand-new account: mobile_no is the password-reset lookup key, so
 * MOBIN's reset OTP would be sent to the owner's phone, and his account email
 * would be the owner's address.
 *
 * WHAT IT DOES
 * ------------
 *  1. Clears mobile and email on employee 42. They are NOT replaced with
 *     anything — MOBIN's real contact details are unknown and will not be
 *     invented. Blank fails safe: reset-password-request rejects falsy input,
 *     so the account cannot use SMS reset until real details are entered.
 *  2. Creates a login for employee 42 using the application's own convention
 *     from createDefaultLoginForEmployee():
 *        username  = employee_code lowercased  -> "dev-325"
 *        password  = employee_code             -> "DEV-325"  (bcrypt, 10 rounds)
 *        role      = employee.role             -> "Technician"
 *        must_change_password = 1
 *     Mobile and email are left blank for the reason above.
 *
 * @sayeed_dp is NOT touched. It is already linked correctly and is the owner's
 * own developer account.
 *
 * SAFETY
 * ------
 *  - Dry run by default.
 *  - Single transaction across both tables.
 *  - Refuses to run if employee 42 is missing/inactive, if it already has a
 *    login, if the username is taken, or if @sayeed_dp is not still on
 *    employee 60. Every guard is re-checked at apply time.
 *  - Creates rows; deletes nothing and modifies no other account.
 *
 * RUN
 * ---
 *   node scripts/separate_mobin_and_create_login.cjs           # dry run
 *   node scripts/separate_mobin_and_create_login.cjs --apply   # perform
 */

require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const APPLY = process.argv.includes("--apply");

const MOBIN_EMPLOYEE_ID = 42;
const OWNER_EMPLOYEE_ID = 60;
const OWNER_USERNAME = "sayeed_dp";

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT || 3306),
  });

  const [empRows] = await conn.query(
    "SELECT employee_id, employee_code, full_name, role, mobile, email, is_active FROM employees WHERE employee_id = ?",
    [MOBIN_EMPLOYEE_ID]
  );
  if (!empRows.length) {
    console.error(`Employee ${MOBIN_EMPLOYEE_ID} not found.`);
    await conn.end();
    process.exit(1);
  }
  const emp = empRows[0];
  const username = String(emp.employee_code).trim().toLowerCase();
  const tempPassword = String(emp.employee_code).trim();

  console.log("MOBIN's employee record as it stands:");
  console.table([emp]);
  console.log(`\nPlanned changes:`);
  console.log(`  1. employees ${MOBIN_EMPLOYEE_ID}: mobile '${emp.mobile}' -> ''   (owner's number)`);
  console.log(`     employees ${MOBIN_EMPLOYEE_ID}: email  '${emp.email}' -> NULL (owner's address)`);
  console.log(`  2. create login  username '${username}'  role '${emp.role}'  temp password '${tempPassword}'`);
  console.log(`     must_change_password = 1, mobile/email left blank`);

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to perform these changes.");
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    if (!emp.is_active) throw new Error(`Employee ${MOBIN_EMPLOYEE_ID} is inactive`);
    if (!emp.employee_code) throw new Error(`Employee ${MOBIN_EMPLOYEE_ID} has no employee_code`);
    if (!emp.role) throw new Error(`Employee ${MOBIN_EMPLOYEE_ID} has no role`);

    // The owner's account must still be correctly linked; if it is not, the
    // situation has changed since this was written and we should not proceed.
    const [owner] = await conn.query(
      "SELECT user_id, employee_id FROM user_access_master WHERE username = ?",
      [OWNER_USERNAME]
    );
    if (!owner.length || Number(owner[0].employee_id) !== OWNER_EMPLOYEE_ID) {
      throw new Error(
        `@${OWNER_USERNAME} is not linked to employee ${OWNER_EMPLOYEE_ID} — state has changed, aborting`
      );
    }

    const [existingLink] = await conn.query(
      "SELECT username FROM user_access_master WHERE employee_id = ?",
      [MOBIN_EMPLOYEE_ID]
    );
    if (existingLink.length) {
      throw new Error(`Employee ${MOBIN_EMPLOYEE_ID} already has login @${existingLink[0].username}`);
    }

    const [taken] = await conn.query(
      "SELECT user_id FROM user_access_master WHERE LOWER(username)=LOWER(?) UNION SELECT user_id FROM users WHERE LOWER(username)=LOWER(?)",
      [username, username]
    );
    if (taken.length) throw new Error(`Username '${username}' is already taken`);

    // 1. Strip the owner's contact details off MOBIN's record.
    const [r0] = await conn.execute(
      "UPDATE employees SET mobile = '', email = NULL WHERE employee_id = ?",
      [MOBIN_EMPLOYEE_ID]
    );

    // 2. Create the login, matching createDefaultLoginForEmployee() exactly.
    const password_hash = await bcrypt.hash(tempPassword, 10);
    const [r1] = await conn.execute(
      `INSERT INTO user_access_master
         (full_name, employee_id, username, email, user_role, access_level, is_active, mobile_no, password_hash, must_change_password)
       VALUES (?, ?, ?, NULL, ?, ?, 1, '', ?, 1)`,
      [emp.full_name, MOBIN_EMPLOYEE_ID, username, emp.role, emp.role, password_hash]
    );
    const [r2] = await conn.execute(
      `INSERT INTO users
         (full_name, username, password_hash, role, employee_id, is_active, mobile_no, created_at, must_change_password)
       VALUES (?, ?, ?, ?, ?, 1, '', NOW(), 1)`,
      [emp.full_name, username, password_hash, emp.role, MOBIN_EMPLOYEE_ID]
    );

    console.log(
      `\nemployees updated: ${r0.affectedRows} | user_access_master id ${r1.insertId} | users id ${r2.insertId}`
    );
    if (r0.affectedRows !== 1 || !r1.insertId || !r2.insertId) {
      throw new Error("Unexpected result — rolling back");
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
    `SELECT u.user_id, u.username, u.full_name, u.user_role, u.email, u.mobile_no,
            u.employee_id, u.must_change_password, e.employee_code, e.full_name AS emp_name,
            e.mobile AS emp_mobile, e.email AS emp_email
       FROM user_access_master u
       LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE u.employee_id IN (?, ?)`,
    [MOBIN_EMPLOYEE_ID, OWNER_EMPLOYEE_ID]
  );
  console.log("AFTER — the two identities, now separate:");
  console.table(after);

  await conn.end();
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
