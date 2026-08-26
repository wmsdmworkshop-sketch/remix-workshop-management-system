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

  // Active JCM records
  const [active]: any = await p.query(
    "SELECT job_card_id, job_card_no, vehicle_reg, customer_name, job_status, assigned_to FROM job_card_master WHERE job_status NOT IN ('Ready','Delivered') ORDER BY job_card_id DESC LIMIT 30"
  );
  console.log("Active JCM records:", active.length);
  for (const r of active) {
    console.log(`  ID:${r.job_card_id} | JC:${r.job_card_no} | VRN:${r.vehicle_reg} | Status:${r.job_status} | AssignedTo:${r.assigned_to}`);
  }

  // Duplicate active VRNs in JCM
  const [dupes]: any = await p.query(
    "SELECT vehicle_reg, COUNT(*) as c, GROUP_CONCAT(job_card_no ORDER BY job_card_id) as jcs, GROUP_CONCAT(job_card_id ORDER BY job_card_id) as ids FROM job_card_master WHERE job_status NOT IN ('Ready','Delivered') AND vehicle_reg IS NOT NULL AND vehicle_reg != '' GROUP BY vehicle_reg HAVING COUNT(*) > 1"
  );
  console.log("\nDuplicate active VRNs in JCM:", dupes.length);
  for (const d of dupes) {
    console.log(`  VRN:${d.vehicle_reg} x${d.c} | JCs:${d.jcs} | IDs:${d.ids}`);
  }

  // Total JCM
  const [total]: any = await p.query("SELECT COUNT(*) as c FROM job_card_master");
  console.log("\nTotal JCM records:", total[0].c);

  // All VRNs that have manager assignments
  const [saVrns]: any = await p.query(
    "SELECT ma.assigned_sa_name, ge.vin, jcm.job_card_no, jcm.job_card_id FROM tbl_manager_assignment ma JOIN tbl_gate_entry ge ON ge.gate_entry_id = ma.gate_entry_id LEFT JOIN job_card_master jcm ON jcm.vehicle_reg = REPLACE(ge.vin, 'VIN-', '') ORDER BY ma.assigned_at DESC"
  );
  console.log("\nManager assignments mapped to JCM:");
  for (const r of saVrns) {
    const vrn = (r.vin || "").replace("VIN-", "");
    console.log(`  SA:${r.assigned_sa_name} | VRN:${vrn} | JCM JC:${r.job_card_no || 'NO-MATCH'} | JCM ID:${r.job_card_id || 'NO-MATCH'}`);
  }

  await p.end();
  process.exit(0);
})();
