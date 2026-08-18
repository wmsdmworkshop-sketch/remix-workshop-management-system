import { pool as dbPool } from "../db/index.ts";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "wms_jwt_secret_key_2026_production_secure_dwip";

async function runAudit() {
  console.log("===============================================================================");
  console.log("     DWIP ENTERPRISE — INDEPENDENT EVIDENCE-BASED FINAL AUDIT");
  console.log("===============================================================================\n");

  // -------------------------------------------------------------------------
  // 1. DATABASE AUDIT: EXACT COUNTS
  // -------------------------------------------------------------------------
  console.log("--- 1. DATABASE INTEGRITY: EXACT READ-ONLY COUNTS ---");
  
  // Total Employees
  const [empCountRows] = await dbPool.query("SELECT COUNT(*) as count FROM employees") as any[];
  const totalEmployees = empCountRows[0].count;

  // Total Users
  const [userCountRows] = await dbPool.query("SELECT COUNT(*) as count FROM users") as any[];
  const totalUsers = userCountRows[0].count;

  // Total user_access_master records
  const [uamCountRows] = await dbPool.query("SELECT COUNT(*) as count FROM user_access_master") as any[];
  const totalUam = uamCountRows[0].count;

  // Users with employee_id IS NULL
  const [nullEmpUsers] = await dbPool.query("SELECT user_id, username, email, employee_id FROM user_access_master WHERE employee_id IS NULL") as any[];
  const usersWithNullEmp = nullEmpUsers.length;

  // Users with employee_id = 0
  const [zeroEmpUsers] = await dbPool.query("SELECT user_id, username, email, employee_id FROM user_access_master WHERE employee_id = 0") as any[];
  const usersWithZeroEmp = zeroEmpUsers.length;

  // Users referencing non-existent employees
  const [invalidEmpUsers] = await dbPool.query(`
    SELECT u.user_id, u.username, u.employee_id 
    FROM user_access_master u 
    LEFT JOIN employees e ON u.employee_id = e.employee_id 
    WHERE u.employee_id IS NOT NULL AND u.employee_id > 0 AND e.employee_id IS NULL
  `) as any[];

  // Users mapped to inactive employees
  const [inactiveEmpUsers] = await dbPool.query(`
    SELECT u.user_id, u.username, u.employee_id, e.full_name, e.is_active
    FROM user_access_master u
    JOIN employees e ON u.employee_id = e.employee_id
    WHERE e.is_active = 0 OR e.is_active = '0'
  `) as any[];

  // Employees linked to more than one active user (1:1 constraint violation check)
  const [dupEmpUsers] = await dbPool.query(`
    SELECT employee_id, COUNT(*) as user_count, GROUP_CONCAT(username) as usernames
    FROM user_access_master
    WHERE employee_id IS NOT NULL AND employee_id > 0 AND is_active = 1
    GROUP BY employee_id
    HAVING COUNT(*) > 1
  `) as any[];

  // Number of users mapped to EMP001 (employee_id = 1)
  const [emp001Users] = await dbPool.query(`
    SELECT u.user_id, u.username, u.employee_id, e.full_name, e.employee_code
    FROM user_access_master u
    JOIN employees e ON u.employee_id = e.employee_id
    WHERE u.employee_id = 1
  `) as any[];

  // Total unlinked users (employee_id IS NULL OR employee_id = 0)
  const [allUnlinkedUsers] = await dbPool.query(`
    SELECT user_id, username, email, employee_id, user_role, is_active
    FROM user_access_master
    WHERE employee_id IS NULL OR employee_id = 0
  `) as any[];

  console.log(`* Employees: ${totalEmployees}`);
  console.log(`* Users: ${totalUsers}`);
  console.log(`* User Access Master Records: ${totalUam}`);
  console.log(`* Users with employee_id IS NULL: ${usersWithNullEmp}`);
  console.log(`* Users with employee_id = 0: ${usersWithZeroEmp}`);
  console.log(`* Users with non-existent employee_id: ${invalidEmpUsers.length}`);
  console.log(`* Users mapped to inactive employees: ${inactiveEmpUsers.length}`);
  console.log(`* Duplicate employee-user mappings (>1 active user per employee): ${dupEmpUsers.length}`);
  console.log(`* Users mapped to EMP001: ${emp001Users.length}`);
  console.log(`* Total unlinked users: ${allUnlinkedUsers.length}`);

  // -------------------------------------------------------------------------
  // 2. BACKFILL VERIFICATION: patilshashi5558@gmail.com & UNLINKED ACCOUNTS
  // -------------------------------------------------------------------------
  console.log("\n--- 2. BACKFILL VERIFICATION ---");
  const [shashiRows] = await dbPool.query(`
    SELECT u.user_id, u.username, u.email, u.employee_id, e.full_name, e.employee_code, e.role, e.department
    FROM user_access_master u
    LEFT JOIN employees e ON u.employee_id = e.employee_id
    WHERE LOWER(u.username) = 'patilshashi5558@gmail.com' OR LOWER(u.email) = 'patilshashi5558@gmail.com'
  `) as any[];

  if (shashiRows.length > 0) {
    const s = shashiRows[0];
    console.log(`* patilshashi5558@gmail.com:`);
    console.log(`  - User ID: ${s.user_id}`);
    console.log(`  - Employee ID: ${s.employee_id}`);
    console.log(`  - Employee Code: ${s.employee_code}`);
    console.log(`  - Employee Name: ${s.full_name}`);
    console.log(`  - Role: ${s.role}`);
  } else {
    console.log(`* patilshashi5558@gmail.com: NOT FOUND IN DB`);
  }

  console.log("\n* Remaining Unlinked Accounts Listing:");
  if (allUnlinkedUsers.length === 0) {
    console.log("  (None. All active accounts are cleanly mapped).");
  } else {
    for (const u of allUnlinkedUsers) {
      console.log(`  - User ID: ${u.user_id}, Username: '${u.username}', Email: '${u.email || "N/A"}', Role: '${u.user_role}', Status: ${u.is_active ? "Active" : "Inactive"}`);
    }
  }

  // -------------------------------------------------------------------------
  // 3. MULTI-USER IDENTITY RESOLUTION AT RUNTIME
  // -------------------------------------------------------------------------
  console.log("\n--- 3. MULTI-USER IDENTITY RESOLUTION ---");
  
  async function testResolve(userId: number, username: string, claimedEmpId: number | null) {
    const [uRows] = await dbPool.query("SELECT * FROM user_access_master WHERE user_id = ?", [userId]) as any[];
    const u = uRows[0] || { user_id: userId, username, employee_id: claimedEmpId };
    
    let resolvedEmp: any = null;
    if (u.employee_id && u.employee_id > 0) {
      const [eRows] = await dbPool.query("SELECT * FROM employees WHERE employee_id = ?", [u.employee_id]) as any[];
      if (eRows.length > 0) {
        resolvedEmp = eRows[0];
      }
    }
    return {
      username: u.username,
      user_id: u.user_id,
      employee_id: u.employee_id,
      resolved_employee: resolvedEmp ? `${resolvedEmp.employee_code} / ${resolvedEmp.full_name}` : "null (Unlinked)"
    };
  }

  // Find representative users in DB
  const [abdulUser] = await dbPool.query("SELECT user_id, username, employee_id FROM user_access_master WHERE employee_id = 1 LIMIT 1") as any[];
  const [shashiUser] = await dbPool.query("SELECT user_id, username, employee_id FROM user_access_master WHERE employee_id = 29 LIMIT 1") as any[];
  const [mustafaUser] = await dbPool.query("SELECT user_id, username, employee_id FROM user_access_master WHERE employee_id = 22 LIMIT 1") as any[];

  if (abdulUser.length > 0) {
    const resA = await testResolve(abdulUser[0].user_id, abdulUser[0].username, 1);
    console.log(`* Abdul Gani Shek: Resolved to ${resA.resolved_employee}`);
  }
  if (shashiUser.length > 0) {
    const resS = await testResolve(shashiUser[0].user_id, shashiUser[0].username, 29);
    console.log(`* Shashikumar: Resolved to ${resS.resolved_employee}`);
  }
  if (mustafaUser.length > 0) {
    const resM = await testResolve(mustafaUser[0].user_id, mustafaUser[0].username, 22);
    console.log(`* Mustafa: Resolved to ${resM.resolved_employee}`);
  }

  // Unlinked user simulation
  const unlinkedRes = await testResolve(9999, "unlinked_test_user", null);
  console.log(`* Unlinked User: Resolved to ${unlinkedRes.resolved_employee}`);

  console.log("\n===============================================================================");
  console.log("     AUDIT COMPLETE — ALL QUERIES EXECUTED AGAINST AUTHORITATIVE DB");
  console.log("===============================================================================");
  process.exit(0);
}

runAudit().catch(err => {
  console.error("Audit script failure:", err);
  process.exit(1);
});
