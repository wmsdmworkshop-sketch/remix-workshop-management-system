/**
 * One-off: delete the orphaned duplicate login @mallu_st.
 *
 * WHY
 * ---
 * MALLINATH has two login accounts:
 *
 *   @mallu_st  user_id 24  "mallinath"  employee_id = 0   <- orphan, deleted here
 *   @dev-227   user_id 59  "MALLINATH"  employee_id = 13 -> DEV-227  (kept)
 *
 * @mallu_st points at employee_id 0, a row that does not exist, so it is not
 * linked to anybody in the Employee Directory. @dev-227 is the properly linked
 * account and is untouched.
 *
 * EVIDENCE IT IS SAFE TO DELETE (verified before writing this script)
 * ------------------------------------------------------------------
 *   login_history            0 rows   <- the account has NEVER been logged into
 *   authorization_audit_log  0 rows
 *   field_audit_history      0 rows
 *   overtime_api_logs        0 rows
 *   security_audit_logs      0 rows
 *   user_overrides           0 rows
 *
 * A schema-wide scan of every varchar/text column whose name suggests a user,
 * actor, technician or advisor reference found the string 'mallu_st' in exactly
 * two places: user_access_master.username and users.username — the account rows
 * themselves. Nothing else in the database points at it, so no history is
 * orphaned by removing it.
 *
 * SAFETY
 * ------
 *  - Dry run by default.
 *  - Single transaction.
 *  - Refuses to run if the account is a developer or admin, if it is linked to a
 *    real employee, or if ANY referencing row has appeared since. Those guards
 *    are re-checked at apply time, not assumed from this comment.
 *  - Deletes exactly two rows and nothing else.
 *
 * RUN
 * ---
 *   node scripts/delete_orphan_login_mallu_st.cjs           # dry run
 *   node scripts/delete_orphan_login_mallu_st.cjs --apply   # perform
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

const APPLY = process.argv.includes("--apply");

const USERNAME = "mallu_st";
const USER_ID = 24;
const PROTECTED_ROLES = ["developer", "admin"];
const REF_TABLES = [
  "login_history",
  "authorization_audit_log",
  "field_audit_history",
  "overtime_api_logs",
  "security_audit_logs",
  "user_overrides",
];

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT || 3306),
  });

  const [uam] = await conn.query(
    "SELECT user_id, username, full_name, user_role, employee_id, is_active FROM user_access_master WHERE username = ?",
    [USERNAME]
  );
  const [usr] = await conn.query(
    "SELECT user_id, username, full_name, role, employee_id FROM users WHERE username = ?",
    [USERNAME]
  );

  if (uam.length === 0 && usr.length === 0) {
    console.log(`Nothing to do — no account named '${USERNAME}' exists.`);
    await conn.end();
    return;
  }

  console.log("Account to delete:");
  console.table([...uam, ...usr]);

  // Count anything that references it.
  const refs = [];
  for (const t of REF_TABLES) {
    try {
      const [r] = await conn.query(`SELECT COUNT(*) n FROM \`${t}\` WHERE user_id = ?`, [USER_ID]);
      if (r[0].n > 0) refs.push({ table: t, rows: Number(r[0].n) });
    } catch {
      /* table absent — nothing to reference */
    }
  }
  console.log(
    refs.length ? `\nReferencing rows found: ${JSON.stringify(refs)}` : "\nReferencing rows: none."
  );

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to delete this account.");
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    const acct = uam[0];
    if (acct) {
      const role = String(acct.user_role || "").toLowerCase();
      if (PROTECTED_ROLES.includes(role)) {
        throw new Error(`Refusing to delete a '${role}' account — protected role`);
      }
      if (acct.employee_id && Number(acct.employee_id) > 0) {
        const [emp] = await conn.query("SELECT employee_id FROM employees WHERE employee_id = ?", [
          acct.employee_id,
        ]);
        if (emp.length) {
          throw new Error(
            `Refusing to delete: account is linked to real employee ${acct.employee_id}, so it is not an orphan`
          );
        }
      }
    }
    if (refs.length) {
      throw new Error(
        `Refusing to delete: ${refs.map((r) => `${r.table} (${r.rows})`).join(", ")} still reference this account`
      );
    }

    const r1 = await conn.execute("DELETE FROM user_access_master WHERE username = ? AND user_id = ?", [
      USERNAME,
      USER_ID,
    ]);
    const r2 = await conn.execute("DELETE FROM users WHERE username = ? AND user_id = ?", [
      USERNAME,
      USER_ID,
    ]);

    const affected = [r1[0].affectedRows, r2[0].affectedRows];
    console.log(`\naffectedRows [user_access_master, users]: ${affected.join(", ")}`);
    if (affected.reduce((a, b) => a + b, 0) === 0) {
      throw new Error("Nothing was deleted — rolling back");
    }

    await conn.commit();
    console.log("COMMITTED.\n");
  } catch (err) {
    await conn.rollback();
    console.error("ROLLED BACK:", err.message);
    await conn.end();
    process.exit(1);
  }

  const [gone] = await conn.query(
    "SELECT COUNT(*) n FROM user_access_master WHERE username = ? UNION ALL SELECT COUNT(*) FROM users WHERE username = ?",
    [USERNAME, USERNAME]
  );
  console.log(`Remaining rows named '${USERNAME}': ${gone.map((r) => r.n).join(", ")}`);

  const [kept] = await conn.query(
    `SELECT user_id, username, full_name, user_role, mobile_no, employee_id
       FROM user_access_master WHERE user_id = 59`
  );
  console.log("\nMALLINATH's remaining account:");
  console.table(kept);

  await conn.end();
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
