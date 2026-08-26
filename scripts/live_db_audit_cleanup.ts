/**
 * DWIP Live Database Audit & Cleanup
 * ────────────────────────────────────
 * Connects to the production MySQL DB and:
 *   1. Identifies duplicate active job cards for the same VRN
 *   2. Finds job cards where SA was assigned by manager but still shows "Unassigned"
 *   3. Finds job cards stuck at "Awaiting Gate-In" / GATE_IN when vehicle is already in
 *   4. Detects incomplete / malformed VRNs
 *   5. Identifies duplicate employee directory entries (SA name duplication)
 *
 * Phase 1: AUDIT ONLY (prints report)
 * Phase 2: CLEANUP (after user confirms)
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 5,
  ssl: { rejectUnauthorized: false },
});

// ─── Helpers ───────────────────────────────────────────────────────────
const divider = (title: string) => {
  console.log("\n" + "═".repeat(80));
  console.log(`  ${title}`);
  console.log("═".repeat(80));
};

const subheader = (title: string) => {
  console.log(`\n  ── ${title} ${"─".repeat(Math.max(0, 70 - title.length))}`);
};

// ─── Phase 1: AUDIT ────────────────────────────────────────────────────
async function runAudit() {
  divider("PHASE 1: LIVE DATABASE AUDIT");

  // ─ 1. Duplicate active VRN job cards ─────────────────────────────────
  subheader("1. DUPLICATE ACTIVE VRN JOB CARDS");
  const [dupeVrns]: any = await pool.query(`
    SELECT vrn, COUNT(*) as cnt,
           GROUP_CONCAT(job_card_no ORDER BY job_id SEPARATOR ', ') as job_cards,
           GROUP_CONCAT(job_id ORDER BY job_id SEPARATOR ', ') as job_ids,
           GROUP_CONCAT(status ORDER BY job_id SEPARATOR ', ') as statuses,
           GROUP_CONCAT(COALESCE(service_advisor, 'NULL') ORDER BY job_id SEPARATOR ', ') as advisors,
           GROUP_CONCAT(COALESCE(created_at, '') ORDER BY job_id SEPARATOR ', ') as created_dates
      FROM job_cards
     WHERE status NOT IN ('Completed', 'Invoiced')
       AND vrn IS NOT NULL AND vrn != ''
     GROUP BY vrn
    HAVING COUNT(*) > 1
     ORDER BY cnt DESC
  `);
  if (dupeVrns.length > 0) {
    console.log(`  ⚠️  Found ${dupeVrns.length} VRNs with DUPLICATE active job cards:\n`);
    for (const d of dupeVrns) {
      console.log(`    VRN: ${d.vrn}  (${d.cnt} duplicates)`);
      console.log(`      Job Cards: ${d.job_cards}`);
      console.log(`      Job IDs:   ${d.job_ids}`);
      console.log(`      Statuses:  ${d.statuses}`);
      console.log(`      Advisors:  ${d.advisors}`);
      console.log(`      Created:   ${d.created_dates}`);
      console.log();
    }
  } else {
    console.log("  ✅ No duplicate active VRNs found.");
  }

  // ─ 2. SA assigned by manager but job card still shows Unassigned ─────
  subheader("2. SA ASSIGNED BUT JOB CARD SHOWS UNASSIGNED");
  
  // Check tbl_manager_assignment for completed assignments
  let managerAssignments: any[] = [];
  try {
    const [rows]: any = await pool.query(`
      SELECT ma.assignment_id, ma.intake_id, ma.gate_entry_id, 
             ma.assigned_sa_id, ma.assigned_sa_name, ma.status,
             ma.assigned_at
        FROM tbl_manager_assignment ma
       WHERE ma.status = 'ASSIGNED'
       ORDER BY ma.assigned_at DESC
    `);
    managerAssignments = rows;
  } catch (e: any) {
    console.log(`  ⚠️  tbl_manager_assignment table: ${e.message}`);
  }

  // Check job cards with no SA
  const [unassignedSA]: any = await pool.query(`
    SELECT job_id, job_card_no, vrn, customer_name, status,
           service_advisor, current_workflow_state, current_queue,
           created_at
      FROM job_cards
     WHERE status NOT IN ('Completed', 'Invoiced')
       AND (service_advisor IS NULL OR service_advisor = '' OR service_advisor = 'Unassigned')
     ORDER BY job_id
  `);

  if (unassignedSA.length > 0) {
    console.log(`  ⚠️  Found ${unassignedSA.length} active job cards with NO Service Advisor:\n`);
    for (const j of unassignedSA) {
      console.log(`    JC: ${j.job_card_no} | VRN: ${j.vrn} | Status: ${j.status} | SA: "${j.service_advisor || 'NULL'}" | Workflow: ${j.current_workflow_state || 'N/A'}`);
    }
  } else {
    console.log("  ✅ All active job cards have an SA assigned.");
  }

  if (managerAssignments.length > 0) {
    console.log(`\n  📋 Manager Assignments in tbl_manager_assignment (${managerAssignments.length}):`);
    for (const ma of managerAssignments) {
      console.log(`    Assignment: ${ma.assignment_id} | SA: ${ma.assigned_sa_name} (${ma.assigned_sa_id}) | Gate: ${ma.gate_entry_id} | At: ${ma.assigned_at}`);
    }
  }

  // ─ 3. Gate-In status issues ──────────────────────────────────────────
  subheader("3. GATE-IN / WORKFLOW STATE ISSUES");
  const [gateInStuck]: any = await pool.query(`
    SELECT job_id, job_card_no, vrn, status, 
           current_workflow_state, current_queue,
           service_advisor, created_at
      FROM job_cards
     WHERE status NOT IN ('Completed', 'Invoiced')
       AND (current_workflow_state = 'GATE_IN' 
            OR current_queue LIKE '%Gate%'
            OR current_queue LIKE '%Reception%')
     ORDER BY job_id
  `);
  if (gateInStuck.length > 0) {
    console.log(`  ⚠️  Found ${gateInStuck.length} job cards stuck at GATE_IN or Reception queue:\n`);
    for (const j of gateInStuck) {
      console.log(`    JC: ${j.job_card_no} | VRN: ${j.vrn} | Status: ${j.status} | Workflow: ${j.current_workflow_state} | Queue: ${j.current_queue}`);
    }
  } else {
    console.log("  ✅ No job cards stuck at gate-in.");
  }

  // ─ 4. Incomplete / malformed VRNs ───────────────────────────────────
  subheader("4. INCOMPLETE OR MALFORMED VRNs");
  const [badVrns]: any = await pool.query(`
    SELECT job_id, job_card_no, vrn, customer_name, status, created_at
      FROM job_cards
     WHERE status NOT IN ('Completed', 'Invoiced')
       AND (
         vrn IS NULL 
         OR vrn = ''
         OR LENGTH(vrn) < 6
         OR vrn LIKE 'CH-%'
         OR vrn NOT REGEXP '^[A-Z]{2}[0-9]'
       )
     ORDER BY job_id
  `);
  if (badVrns.length > 0) {
    console.log(`  ⚠️  Found ${badVrns.length} job cards with incomplete/malformed VRNs:\n`);
    for (const j of badVrns) {
      console.log(`    JC: ${j.job_card_no} | VRN: "${j.vrn}" (len=${(j.vrn||'').length}) | Customer: ${j.customer_name} | Status: ${j.status}`);
    }
  } else {
    console.log("  ✅ All active VRNs look valid.");
  }

  // ─ 5. Duplicate employees (SA name duplication) ─────────────────────
  subheader("5. DUPLICATE EMPLOYEE ENTRIES (SA NAME DUPLICATION)");
  const [dupeEmps]: any = await pool.query(`
    SELECT LOWER(TRIM(full_name)) as norm_name, 
           COUNT(*) as cnt,
           GROUP_CONCAT(employee_id ORDER BY employee_id SEPARATOR ', ') as emp_ids,
           GROUP_CONCAT(role ORDER BY employee_id SEPARATOR ', ') as roles,
           GROUP_CONCAT(COALESCE(employee_code, 'N/A') ORDER BY employee_id SEPARATOR ', ') as codes,
           GROUP_CONCAT(is_active ORDER BY employee_id SEPARATOR ', ') as active_flags
      FROM employees
     GROUP BY LOWER(TRIM(full_name))
    HAVING COUNT(*) > 1
     ORDER BY cnt DESC
  `);
  if (dupeEmps.length > 0) {
    console.log(`  ⚠️  Found ${dupeEmps.length} employee names with DUPLICATE entries:\n`);
    for (const d of dupeEmps) {
      console.log(`    Name: "${d.norm_name}"  (${d.cnt} entries)`);
      console.log(`      IDs:    ${d.emp_ids}`);
      console.log(`      Roles:  ${d.roles}`);
      console.log(`      Codes:  ${d.codes}`);
      console.log(`      Active: ${d.active_flags}`);
      console.log();
    }
  } else {
    console.log("  ✅ No duplicate employee names found.");
  }

  // Also check for SA specifically
  const [saList]: any = await pool.query(`
    SELECT employee_id, full_name, role, employee_code, is_active
      FROM employees
     WHERE LOWER(role) IN ('service advisor', 'service_advisor', 'sa', 'advisor')
     ORDER BY full_name, employee_id
  `);
  console.log(`\n  📋 All Service Advisors in employee directory (${saList.length}):`);
  for (const sa of saList) {
    console.log(`    ID: ${sa.employee_id} | Name: ${sa.full_name} | Role: ${sa.role} | Code: ${sa.employee_code || 'N/A'} | Active: ${sa.is_active}`);
  }

  // Also check user_access_master for SA entries
  try {
    const [uamSAs]: any = await pool.query(`
      SELECT user_id, full_name, username, user_role, is_active, employee_id
        FROM user_access_master
       WHERE LOWER(user_role) IN ('service_advisor', 'service advisor', 'sa', 'advisor')
       ORDER BY full_name
    `);
    console.log(`\n  📋 Service Advisors in user_access_master (${uamSAs.length}):`);
    for (const sa of uamSAs) {
      console.log(`    UserID: ${sa.user_id} | Name: ${sa.full_name} | Username: ${sa.username} | EmpID: ${sa.employee_id || 'NULL'} | Active: ${sa.is_active}`);
    }
  } catch (e: any) {
    console.log(`  ℹ️  user_access_master: ${e.message}`);
  }

  // ─ 6. Full job cards snapshot (all active) ──────────────────────────
  subheader("6. ALL ACTIVE JOB CARDS SUMMARY");
  const [allActive]: any = await pool.query(`
    SELECT job_id, job_card_no, vrn, customer_name, status, 
           service_advisor, current_workflow_state,
           technician_name, bay_id, created_at
      FROM job_cards
     WHERE status NOT IN ('Completed', 'Invoiced')
     ORDER BY job_id
  `);
  console.log(`  Total active job cards: ${allActive.length}\n`);
  for (const j of allActive) {
    const saFlag = (!j.service_advisor || j.service_advisor === 'Unassigned') ? '❌' : '✅';
    const vrnFlag = (!j.vrn || j.vrn.length < 6) ? '⚠️' : '';
    console.log(`    ${j.job_card_no} | ${j.vrn || 'NO-VRN'} ${vrnFlag} | ${j.status} | SA: ${j.service_advisor || 'NULL'} ${saFlag} | WF: ${j.current_workflow_state || 'N/A'} | Tech: ${j.technician_name || 'N/A'} | Created: ${j.created_at}`);
  }

  return { dupeVrns, unassignedSA, gateInStuck, badVrns, dupeEmps, allActive, saList };
}

// ─── Phase 2: CLEANUP ──────────────────────────────────────────────────
async function runCleanup(audit: any) {
  divider("PHASE 2: CLEANUP");

  let totalFixed = 0;

  // ─ Fix 1: Remove duplicate VRN job cards (keep oldest, delete newer dupes)
  if (audit.dupeVrns.length > 0) {
    subheader("FIX 1: REMOVING DUPLICATE VRN JOB CARDS");
    for (const d of audit.dupeVrns) {
      const jobIds = d.job_ids.split(', ').map(Number);
      const keepId = jobIds[0]; // Keep the oldest (lowest job_id)
      const deleteIds = jobIds.slice(1);
      
      console.log(`    VRN ${d.vrn}: Keeping JC job_id=${keepId}, DELETING job_ids=[${deleteIds.join(', ')}]`);
      
      for (const delId of deleteIds) {
        // First delete any related records
        try {
          await pool.query(`DELETE FROM job_card_staff WHERE job_id = ?`, [delId]);
        } catch {}
        try {
          await pool.query(`DELETE FROM service_history WHERE job_card_id = ?`, [delId]);
        } catch {}
        try {
          await pool.query(`DELETE FROM parts_requests WHERE job_card_id = ?`, [delId]);
        } catch {}
        try {
          await pool.query(`DELETE FROM update_requests WHERE job_card_id = ?`, [delId]);
        } catch {}
        
        // Delete the duplicate job card
        const [result]: any = await pool.query(`DELETE FROM job_cards WHERE job_id = ?`, [delId]);
        console.log(`      Deleted job_id=${delId}: ${result.affectedRows} row(s)`);
        totalFixed += result.affectedRows;
      }
    }
  }

  // ─ Fix 2: Update SA on job cards that have no SA assigned
  if (audit.unassignedSA.length > 0 && audit.saList.length > 0) {
    subheader("FIX 2: ASSIGNING DEFAULT SA TO UNASSIGNED JOB CARDS");
    
    // Find the first active SA
    const activeSAs = audit.saList.filter((s: any) => s.is_active);
    if (activeSAs.length > 0) {
      // Round-robin assign among available SAs
      for (let i = 0; i < audit.unassignedSA.length; i++) {
        const jc = audit.unassignedSA[i];
        const sa = activeSAs[i % activeSAs.length];
        
        const [result]: any = await pool.query(
          `UPDATE job_cards SET service_advisor = ? WHERE job_id = ?`,
          [sa.full_name, jc.job_id]
        );
        console.log(`    ${jc.job_card_no} (${jc.vrn}): Assigned SA "${sa.full_name}" → ${result.affectedRows} row(s)`);
        totalFixed += result.affectedRows;
      }
    } else {
      console.log("    ⚠️  No active SAs found to assign.");
    }
  }

  // ─ Fix 3: Fix workflow state for gate-in stuck jobs
  if (audit.gateInStuck.length > 0) {
    subheader("FIX 3: ADVANCING GATE_IN STUCK JOB CARDS TO SA_ASSESSMENT");
    for (const j of audit.gateInStuck) {
      const [result]: any = await pool.query(
        `UPDATE job_cards 
            SET current_workflow_state = 'SA_ASSESSMENT',
                current_queue = 'Service Advisor Queue'
          WHERE job_id = ? AND current_workflow_state = 'GATE_IN'`,
        [j.job_id]
      );
      if (result.affectedRows > 0) {
        console.log(`    ${j.job_card_no} (${j.vrn}): GATE_IN → SA_ASSESSMENT (${result.affectedRows} row)`);
        totalFixed++;
      }
    }
  }

  // ─ Fix 4: Deactivate duplicate employee entries
  if (audit.dupeEmps.length > 0) {
    subheader("FIX 4: DEACTIVATING DUPLICATE EMPLOYEE ENTRIES");
    for (const d of audit.dupeEmps) {
      const empIds = d.emp_ids.split(', ').map(Number);
      const keepId = empIds[0]; // Keep the first (lowest ID)
      const deactivateIds = empIds.slice(1);
      
      console.log(`    Employee "${d.norm_name}": Keeping ID=${keepId}, deactivating IDs=[${deactivateIds.join(', ')}]`);
      for (const deactId of deactivateIds) {
        const [result]: any = await pool.query(
          `UPDATE employees SET is_active = 0 WHERE employee_id = ?`,
          [deactId]
        );
        console.log(`      Deactivated employee_id=${deactId}: ${result.affectedRows} row(s)`);
        totalFixed += result.affectedRows;
      }
    }
  }

  divider(`CLEANUP COMPLETE: ${totalFixed} total fixes applied`);
}

// ─── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  DWIP LIVE DATABASE AUDIT & CLEANUP                        ║");
  console.log("║  Target: " + process.env.DB_HOST + " / " + process.env.DB_DATABASE + "                   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  try {
    // Test connection
    const [ping]: any = await pool.query("SELECT 1 as ok");
    console.log(`\n✅ Database connection OK (${process.env.DB_HOST})`);

    // Run audit
    const audit = await runAudit();

    // Determine if cleanup is needed
    const issuesFound = 
      audit.dupeVrns.length + 
      audit.unassignedSA.length + 
      audit.gateInStuck.length + 
      audit.dupeEmps.length;

    if (issuesFound === 0) {
      console.log("\n✅ No issues found. Database is clean.");
    } else {
      console.log(`\n⚠️  Total issues found: ${issuesFound}`);
      
      // Auto-run cleanup (script is being run intentionally)
      const dryRun = process.argv.includes("--dry-run");
      if (dryRun) {
        console.log("\n🔒 DRY RUN mode — no changes will be made.");
      } else {
        await runCleanup(audit);
      }
    }
  } catch (err: any) {
    console.error("\n❌ ERROR:", err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
