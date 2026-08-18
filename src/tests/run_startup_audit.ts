import { startupSchemaValidator } from "../core/StartupSchemaValidator.ts";
import { pool as dbPool } from "../db/index.ts";

async function run() {
  console.log("===============================================================================");
  console.log("     STARTUP SCHEMA VALIDATOR & BACKFILL LIVE EXECUTION");
  console.log("===============================================================================\n");

  console.log("--- RUN 1: Executing StartupSchemaValidator ---");
  const report1 = await startupSchemaValidator.validateAndRepair();
  console.log("Success:", report1.success);
  console.log("Diagnostics:");
  report1.diagnostics.forEach(d => console.log(" ", d));

  console.log("\n--- VERIFYING patilshashi5558@gmail.com IN DATABASE ---");
  const [shashiRows] = await dbPool.query(`
    SELECT u.user_id, u.username, u.email, u.employee_id, e.full_name, e.employee_code, e.role
    FROM user_access_master u
    LEFT JOIN employees e ON u.employee_id = e.employee_id
    WHERE LOWER(u.username) = 'patilshashi5558@gmail.com' OR LOWER(u.email) = 'patilshashi5558@gmail.com'
  `) as any[];
  console.log(JSON.stringify(shashiRows, null, 2));

  console.log("\n--- RUN 2: IDEMPOTENCY CHECK (Executing Validator a 2nd time) ---");
  const report2 = await startupSchemaValidator.validateAndRepair();
  console.log("Success:", report2.success);
  console.log("Diagnostics from Run 2:");
  report2.diagnostics.forEach(d => console.log(" ", d));

  console.log("\n--- AUDIT OF ALL REMAINING USERS AFTER BACKFILL ---");
  const [allUsers] = await dbPool.query(`
    SELECT u.user_id, u.username, u.email, u.employee_id, e.employee_code, e.full_name
    FROM user_access_master u
    LEFT JOIN employees e ON u.employee_id = e.employee_id
    ORDER BY u.user_id ASC
  `) as any[];

  console.log(`Total active user accounts: ${allUsers.length}`);
  const linked = allUsers.filter((u: any) => u.employee_id && u.employee_id > 0);
  const unlinked = allUsers.filter((u: any) => !u.employee_id || u.employee_id === 0);

  console.log(`Linked accounts count: ${linked.length}`);
  console.log(`Unlinked accounts count: ${unlinked.length}`);
  console.log("\nUnlinked Accounts Details:");
  unlinked.forEach((u: any) => {
    console.log(`  - User ID ${u.user_id} (${u.username}): employee_id=${u.employee_id}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
