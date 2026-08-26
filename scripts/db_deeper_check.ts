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

  const [all]: any = await p.query("SELECT COUNT(*) as c FROM job_cards");
  console.log("Total job_cards in MySQL:", all[0].c);

  const [active]: any = await p.query("SELECT COUNT(*) as c FROM job_cards WHERE status NOT IN ('Completed','Invoiced')");
  console.log("Active job_cards in MySQL:", active[0].c);

  const [mh]: any = await p.query("SELECT job_id, job_card_no, vrn, service_advisor, status FROM job_cards WHERE vrn LIKE '%MH12%'");
  console.log("MH12 entries:", mh.length);
  for (const j of mh) console.log("  ", j.job_card_no, j.vrn, j.status, j.service_advisor);

  // Also check what the server's getDB() returns at runtime — the 36 JCs the user sees
  // come from the JSON+MySQL hybrid. Let's check which JCs have unassigned SAs in MySQL
  const [noSA]: any = await p.query(
    "SELECT job_id, job_card_no, vrn, service_advisor FROM job_cards WHERE status NOT IN ('Completed','Invoiced') AND (service_advisor IS NULL OR service_advisor = '' OR service_advisor = 'Unassigned')"
  );
  console.log("\nUnassigned SA in MySQL:", noSA.length);
  for (const j of noSA) console.log("  ", j.job_card_no, j.vrn, j.service_advisor);

  // Check for VRNs that the manager assigned but didn't bridge
  const [assignments]: any = await p.query(
    "SELECT ma.assigned_sa_name, ge.vin, ma.status FROM tbl_manager_assignment ma JOIN tbl_gate_entry ge ON ge.gate_entry_id = ma.gate_entry_id ORDER BY ma.assigned_at DESC LIMIT 20"
  );
  console.log("\nManager assignments with VRN resolution:");
  for (const a of assignments) {
    const vrn = (a.vin || "").replace("VIN-", "");
    console.log("  SA:", a.assigned_sa_name, "| VRN:", vrn, "| Status:", a.status);
  }

  // Check UAM entry 23 — it was supposed to be deactivated
  const [uam23]: any = await p.query("SELECT user_id, full_name, username, employee_id, is_active FROM user_access_master WHERE user_id = 23");
  console.log("\nUAM user_id 23:", JSON.stringify(uam23[0]));

  await p.end();
  process.exit(0);
})();
