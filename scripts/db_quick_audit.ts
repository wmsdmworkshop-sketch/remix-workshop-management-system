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

  // Tables
  const [tables] = await p.query("SHOW TABLES");
  console.log("=== TABLES ===");
  console.log(JSON.stringify(tables));

  // SA employees
  console.log("\n=== SA EMPLOYEES ===");
  const [emps]: any = await p.query(
    "SELECT employee_id, full_name, role, employee_code, is_active FROM employees WHERE LOWER(role) IN ('service advisor','service_advisor','sa','advisor') ORDER BY full_name"
  );
  for (const e of emps) {
    console.log(`  ID:${e.employee_id} | ${e.full_name} | Role:${e.role} | Code:${e.employee_code} | Active:${e.is_active}`);
  }

  // Duplicate employees by name
  console.log("\n=== DUPLICATE EMPLOYEE NAMES ===");
  const [dupes]: any = await p.query(
    "SELECT LOWER(TRIM(full_name)) as n, COUNT(*) as c, GROUP_CONCAT(employee_id) as ids, GROUP_CONCAT(role) as roles, GROUP_CONCAT(is_active) as actives FROM employees GROUP BY LOWER(TRIM(full_name)) HAVING COUNT(*) > 1"
  );
  if (dupes.length === 0) console.log("  None found.");
  for (const d of dupes) {
    console.log(`  "${d.n}" x${d.c} | IDs:[${d.ids}] | Roles:[${d.roles}] | Active:[${d.actives}]`);
  }

  // All active job cards
  console.log("\n=== ALL ACTIVE JOB CARDS ===");
  const [jcs]: any = await p.query(
    "SELECT job_id, job_card_no, vrn, customer_name, status, service_advisor, technician_name, workshop_stage, bay_id, created_at FROM job_cards WHERE status NOT IN ('Completed','Invoiced') ORDER BY job_id"
  );
  console.log(`Total active: ${jcs.length}`);
  for (const j of jcs) {
    const saFlag = (!j.service_advisor || j.service_advisor === "Unassigned") ? " <<NO-SA>>" : "";
    const vrnLen = (j.vrn || "").length;
    const vrnFlag = vrnLen < 6 ? " <<SHORT-VRN>>" : "";
    console.log(`  ${j.job_card_no} | VRN:${j.vrn}${vrnFlag} | ${j.status} | SA:${j.service_advisor||"NULL"}${saFlag} | Tech:${j.technician_name||"N/A"} | Stage:${j.workshop_stage||"N/A"} | Created:${j.created_at}`);
  }

  // Duplicate active VRNs
  console.log("\n=== DUPLICATE ACTIVE VRNs ===");
  const [dvs]: any = await p.query(
    "SELECT vrn, COUNT(*) as c, GROUP_CONCAT(job_card_no ORDER BY job_id) as jcs, GROUP_CONCAT(job_id ORDER BY job_id) as ids, GROUP_CONCAT(service_advisor ORDER BY job_id) as sas FROM job_cards WHERE status NOT IN ('Completed','Invoiced') AND vrn IS NOT NULL AND vrn != '' GROUP BY vrn HAVING COUNT(*) > 1"
  );
  if (dvs.length === 0) console.log("  None found.");
  for (const d of dvs) {
    console.log(`  VRN:${d.vrn} x${d.c} | JCs:[${d.jcs}] | IDs:[${d.ids}] | SAs:[${d.sas}]`);
  }

  // VRNs with issues
  console.log("\n=== MALFORMED/INCOMPLETE VRNs ===");
  const [bads]: any = await p.query(
    "SELECT job_id, job_card_no, vrn, customer_name FROM job_cards WHERE status NOT IN ('Completed','Invoiced') AND (vrn IS NULL OR vrn = '' OR LENGTH(vrn) < 6 OR vrn LIKE 'CH-%')"
  );
  if (bads.length === 0) console.log("  None found.");
  for (const b of bads) {
    console.log(`  ${b.job_card_no} | VRN:"${b.vrn}" | Customer:${b.customer_name}`);
  }

  // Manager assignments table
  console.log("\n=== MANAGER ASSIGNMENTS ===");
  try {
    const [mas]: any = await p.query("SELECT * FROM tbl_manager_assignment ORDER BY assigned_at DESC LIMIT 20");
    console.log(`Found ${mas.length} rows`);
    for (const m of mas) {
      console.log(`  ${m.assignment_id} | SA:${m.assigned_sa_name} | Gate:${m.gate_entry_id} | Intake:${m.intake_id} | Status:${m.status} | At:${m.assigned_at}`);
    }
  } catch (e: any) {
    console.log(`  Table error: ${e.message}`);
  }

  // Gate entries
  console.log("\n=== GATE ENTRIES ===");
  try {
    const [gates]: any = await p.query("SELECT * FROM tbl_gate_entry ORDER BY created_at DESC LIMIT 20");
    console.log(`Found ${gates.length} rows`);
    for (const g of gates) {
      console.log(`  ${g.gate_entry_id} | VRN:${g.vrn} | Status:${g.status} | At:${g.created_at}`);
    }
  } catch (e: any) {
    console.log(`  Table error: ${e.message}`);
  }

  // SA technical intake
  console.log("\n=== SA TECHNICAL INTAKES ===");
  try {
    const [intakes]: any = await p.query("SELECT * FROM tbl_sa_technical_intake ORDER BY started_at DESC LIMIT 20");
    console.log(`Found ${intakes.length} rows`);
    for (const i of intakes) {
      console.log(`  ${i.intake_id} | JC:${i.job_card_id} | SA:${i.sa_name} | Status:${i.status} | At:${i.started_at}`);
    }
  } catch (e: any) {
    console.log(`  Table error: ${e.message}`);
  }

  // user_access_master SA entries
  console.log("\n=== USER_ACCESS_MASTER SAs ===");
  try {
    const [uams]: any = await p.query(
      "SELECT user_id, full_name, username, user_role, employee_id, is_active FROM user_access_master WHERE LOWER(user_role) IN ('service_advisor','service advisor','sa','advisor') ORDER BY full_name"
    );
    for (const u of uams) {
      console.log(`  UserID:${u.user_id} | ${u.full_name} | Username:${u.username} | EmpID:${u.employee_id||"NULL"} | Active:${u.is_active}`);
    }
  } catch (e: any) {
    console.log(`  Table error: ${e.message}`);
  }

  await p.end();
})();
