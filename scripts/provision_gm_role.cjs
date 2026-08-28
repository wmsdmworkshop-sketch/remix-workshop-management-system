/**
 * Provision the gm_service role with full module access, and split the two
 * owner accounts into one developer and one GM.
 *
 * WHY THIS IS NEEDED
 * ------------------
 * gm_service is the canonical GM role — server.ts references it in
 * WORKFORCE_ADMIN_ROLES and in the AI assist roles — but it was never
 * provisioned. It held SIX rows granting view-only on just Dashboard and Query,
 * the same two modules stored three different ways:
 *
 *   permission_id 76,77    role_id 34, module_id set,  names NULL
 *   permission_id 216,217  role_id 34, module_id NULL, names set
 *   permission_id 372,373  role_id NULL,               names set
 *
 * That triplication matters because findByRoleAndModule() COALESCEs the two
 * conventions and then returns rows[0] — with duplicates present, which row
 * wins is arbitrary. All six are removed and replaced with exactly one row per
 * module.
 *
 * Assigning gm_service WITHOUT this would have dropped the account from full
 * access to view-only on two screens.
 *
 * WHAT IT DOES
 * ------------
 *  1. Deletes every existing gm_service permission row (all six).
 *  2. Inserts one row per module for all 12 modules with can_view = 1 and
 *     can_edit = 1, mirroring admin's flags exactly (admin has can_comment = 0,
 *     so this does too). Both the IDs and the denormalised names are populated,
 *     so either lookup path resolves.
 *  3. Sets @sayeed_dp to gm_service in user_access_master and users.
 *     @wmsdmworkshop@gmail.com is already 'developer' and is NOT touched.
 *
 * KNOWN CONSEQUENCE — READ THIS
 * -----------------------------
 * 'developer' has no permission rows at all; it bypasses requirePermission
 * outright at server.ts:1506. So @sayeed_dp loses that blanket bypass. It gains
 * edit on all 12 modules, but anything gated on the literal role 'developer'
 * — the AI Brains introspection routes, for instance — will no longer be
 * reachable from that account. Use @wmsdmworkshop@gmail.com for those.
 *
 * This also grants the GM edit rights on Billing, which cuts against the
 * earlier rule that managers must not be able to mark-billed. That was an
 * explicit choice by the operator, recorded here so it is not mistaken for an
 * oversight.
 *
 * SAFETY
 * ------
 *  - Dry run by default.
 *  - Single transaction.
 *  - Refuses to run unless a working 'developer' account other than @sayeed_dp
 *    exists and is active, so developer access cannot be lost entirely.
 *  - Verifies all 12 modules resolve before writing anything.
 *
 * RUN
 * ---
 *   node scripts/provision_gm_role.cjs           # dry run
 *   node scripts/provision_gm_role.cjs --apply   # perform
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

const APPLY = process.argv.includes("--apply");

const GM_ROLE = "gm_service";
const GM_USERNAME = "sayeed_dp";
const DEV_USERNAME = "wmsdmworkshop@gmail.com";

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT || 3306),
  });

  const [roleRows] = await conn.query("SELECT role_id, role_name FROM roles WHERE role_name = ?", [GM_ROLE]);
  if (!roleRows.length) {
    console.error(`Role '${GM_ROLE}' does not exist.`);
    await conn.end();
    process.exit(1);
  }
  const roleId = roleRows[0].role_id;

  const [modules] = await conn.query("SELECT module_id, module_name FROM modules ORDER BY module_id");
  const [existing] = await conn.query(
    "SELECT permission_id, role_id, module_id, role_name, module_name, can_view, can_edit FROM role_permissions WHERE role_id = ? OR role_name = ?",
    [roleId, GM_ROLE]
  );

  console.log(`Existing ${GM_ROLE} permission rows (${existing.length}):`);
  console.table(existing);
  console.log(`\nWill replace with ${modules.length} rows — can_view=1, can_edit=1 on:`);
  console.log("  " + modules.map((m) => m.module_name).join(", "));
  console.log(`\nRole changes:`);
  console.log(`  @${GM_USERNAME}  developer -> ${GM_ROLE}`);
  console.log(`  @${DEV_USERNAME}  stays developer (untouched)`);

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to perform these changes.");
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    if (modules.length === 0) throw new Error("No modules found — aborting");

    // A working developer account other than the one we are demoting MUST exist,
    // otherwise this change could remove developer access entirely.
    const [devs] = await conn.query(
      `SELECT username FROM user_access_master
        WHERE user_role = 'developer' AND is_active = 1 AND username <> ?
          AND password_hash IS NOT NULL AND password_hash <> ''`,
      [GM_USERNAME]
    );
    if (!devs.length) {
      throw new Error(
        `Refusing to proceed: no other active developer account with a password exists. ` +
          `Demoting @${GM_USERNAME} would leave no developer access.`
      );
    }
    console.log(`Developer access preserved via: ${devs.map((d) => "@" + d.username).join(", ")}`);

    // 1. Clear the old rows, including the triplicated ones.
    const [del] = await conn.execute(
      "DELETE FROM role_permissions WHERE role_id = ? OR role_name = ?",
      [roleId, GM_ROLE]
    );
    console.log(`Removed ${del.affectedRows} stale ${GM_ROLE} permission row(s).`);

    // 2. One row per module, with BOTH the ids and the denormalised names set so
    //    either resolution path in findByRoleAndModule() finds it.
    let inserted = 0;
    for (const m of modules) {
      const [r] = await conn.execute(
        `INSERT INTO role_permissions
           (role_id, module_id, role_name, module_name, can_view, can_edit, can_comment)
         VALUES (?, ?, ?, ?, 1, 1, 0)`,
        [roleId, m.module_id, GM_ROLE, m.module_name]
      );
      if (r.affectedRows === 1) inserted++;
    }
    if (inserted !== modules.length) {
      throw new Error(`Inserted ${inserted} of ${modules.length} rows — rolling back`);
    }
    console.log(`Inserted ${inserted} permission row(s).`);

    // 3. Move the GM account onto the role.
    const [u1] = await conn.execute(
      "UPDATE user_access_master SET user_role = ?, access_level = ? WHERE username = ?",
      [GM_ROLE, GM_ROLE, GM_USERNAME]
    );
    const [u2] = await conn.execute("UPDATE users SET role = ? WHERE username = ?", [
      GM_ROLE,
      GM_USERNAME,
    ]);
    console.log(`Role updated — user_access_master: ${u1.affectedRows}, users: ${u2.affectedRows}`);
    if (u1.affectedRows !== 1 || u2.affectedRows !== 1) {
      throw new Error("Expected exactly one row updated in each table — rolling back");
    }

    await conn.commit();
    console.log("COMMITTED.\n");
  } catch (err) {
    await conn.rollback();
    console.error("ROLLED BACK:", err.message);
    await conn.end();
    process.exit(1);
  }

  // Verify through the SAME resolution the app uses.
  const [check] = await conn.query(
    `SELECT COALESCE(m.module_name, rp.module_name) AS module,
            rp.can_view, rp.can_edit, COUNT(*) OVER (PARTITION BY COALESCE(m.module_name, rp.module_name)) AS dupes
       FROM role_permissions rp
       LEFT JOIN roles r ON r.role_id = rp.role_id
       LEFT JOIN modules m ON m.module_id = rp.module_id
      WHERE LOWER(COALESCE(r.role_name, rp.role_name)) = ?
      ORDER BY module`,
    [GM_ROLE]
  );
  console.log(`${GM_ROLE} permissions as the app resolves them:`);
  console.table(check);
  const ambiguous = check.filter((r) => Number(r.dupes) > 1);
  console.log(
    ambiguous.length === 0
      ? "No duplicate module rows — rows[0] is unambiguous."
      : `WARNING: ${ambiguous.length} duplicated module row(s) remain.`
  );

  const [accts] = await conn.query(
    `SELECT u.user_id, u.username, u.full_name, u.user_role, u.access_level, u.employee_id,
            e.employee_code, e.full_name AS emp_name, e.role AS emp_role
       FROM user_access_master u
       LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE u.username IN (?, ?)`,
    [GM_USERNAME, DEV_USERNAME]
  );
  console.log("\nAccounts:");
  console.table(accts);

  await conn.end();
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
