import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

(async () => {
  const p = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: { rejectUnauthorized: false },
  });

  console.log("=== DEACTIVATING DUPLICATE EMPLOYEES ===");
  // Keep IDs 22 (MUSTAFA) and 29 (SHASHIKUMAR) — deactivate older IDs 12, 7
  const [r1]: any = await p.query("UPDATE employees SET is_active = 0 WHERE employee_id IN (12, 7)");
  console.log("Deactivated emp IDs 12, 7:", r1.affectedRows, "rows");

  console.log("\n=== DEACTIVATING ORPHAN UAM ENTRIES ===");
  // Deactivate UAM entries 23, 22 that have no employee_id linkage
  const [r2]: any = await p.query("UPDATE user_access_master SET is_active = 0 WHERE user_id IN (23, 22) AND employee_id IS NULL");
  console.log("Deactivated UAM IDs 23, 22:", r2.affectedRows, "rows");

  console.log("\n=== VERIFY EMPLOYEES ===");
  const [emps]: any = await p.query(
    "SELECT employee_id, full_name, role, is_active FROM employees WHERE LOWER(role) IN ('service_advisor', 'service advisor') ORDER BY employee_id"
  );
  for (const e of emps) {
    console.log(`  EmpID:${e.employee_id} | ${e.full_name} | Active:${e.is_active}`);
  }

  console.log("\n=== VERIFY UAM ===");
  const [uams]: any = await p.query(
    "SELECT user_id, full_name, username, employee_id, is_active FROM user_access_master WHERE LOWER(user_role) IN ('service_advisor', 'service advisor') ORDER BY user_id"
  );
  for (const u of uams) {
    console.log(`  UAM:${u.user_id} | ${u.full_name} | EmpID:${u.employee_id || 'NULL'} | Active:${u.is_active}`);
  }

  await p.end();
  process.exit(0);
})();
