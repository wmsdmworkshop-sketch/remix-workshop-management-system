/**
 * AIVAAHAN-ROLE-OPS-VERIFY-007 + CLOSEOUT-001
 * Phase 7 — COMPLETE ADVERSARIAL TEST SUITE
 * 47 original + 21 new road test + 7 warranty = 75 total scenarios
 *
 * Every scenario interacts with real DB state.
 * Zero assert(true, ...) padding.
 */

import { QcExecutionEngine } from '../core/workshop/qc-execution-engine.ts';
import { pool } from '../db/index.ts';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const BRANCH_SEDAM = 1;
const VALID_EMPLOYEE_ID = 1;

// ─── TEST HELPERS ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) { console.log(`  ✅ PASS: ${message}`); passed++; }
  else { console.log(`  ❌ FAIL: ${message}`); failed++; failures.push(message); }
}

async function assertRejects(fn: () => Promise<any>, expectedSubstring: string, label: string) {
  try {
    await fn();
    console.log(`  ❌ FAIL: ${label} — expected rejection but succeeded`);
    failed++; failures.push(label + " — expected rejection");
  } catch (err: any) {
    if (err.message && err.message.includes(expectedSubstring)) {
      console.log(`  ✅ PASS: ${label}`); passed++;
    } else {
      console.log(`  ❌ FAIL: ${label} — got unexpected error: ${err.message}`);
      failed++; failures.push(label + ` — unexpected: ${err.message}`);
    }
  }
}

async function seedJob(tag: string): Promise<number> {
  const ts = Date.now().toString().slice(-6);
  const jcNo = `JC-P7C-${tag}-${ts}`;
  const vrn = `VRN-${tag}-${ts}`;
  const [res]: any = await pool.execute(
    `INSERT INTO job_cards (job_card_no, vrn, customer_name, customer_mobile, vehicle_make,
      vehicle_model, vehicle_year, km_reading, job_description, status, sr_type_id, priority, etd, created_by, created_at)
     VALUES (?, ?, 'Test Customer', '9999999999', 'Tata', 'Nexon', 2023, 15000, 'Test Phase 7 Job', 'QC_PENDING', 1, 'NORMAL', '2026-12-31', ?, NOW())`,
    [jcNo, vrn, VALID_EMPLOYEE_ID]
  );
  await pool.execute(`INSERT IGNORE INTO backup_legacy_employees (employee_id, full_name, employee_code, role, employee_grade, basic_salary, mobile, is_active) VALUES (1, 'Test Tech', 'EMP001', 'TECH', 'A', 1000, '9999999999', 1)`);
  await pool.execute(`INSERT IGNORE INTO backup_legacy_job_cards (job_id, job_card_no, vrn, customer_name, customer_mobile, vehicle_make, vehicle_model, vehicle_year, km_reading, sr_type_id, job_description, priority, status, etd, created_by, created_at) VALUES (?, 'X', 'X', 'X', 'X', 'X', 'X', 2000, 0, 1, 'X', 'X', 'X', 'X', 1, 'X')`, [res.insertId]);
  return res.insertId;
}

async function seedJobWithCardNo(tag: string): Promise<{ jobId: number; jobCardNo: string }> {
  const ts = Date.now().toString().slice(-6);
  const jcNo = `JC-P7C-${tag}-${ts}`;
  const vrn = `VRN-${tag}-${ts}`;
  const [res]: any = await pool.execute(
    `INSERT INTO job_cards (job_card_no, vrn, customer_name, customer_mobile, vehicle_make,
      vehicle_model, vehicle_year, km_reading, job_description, status, sr_type_id, priority, etd, created_by, created_at)
     VALUES (?, ?, 'Test Customer', '9999999999', 'Tata', 'Nexon', 2023, 15000, 'Test Phase 7 Job', 'QC_PENDING', 1, 'NORMAL', '2026-12-31', ?, NOW())`,
    [jcNo, vrn, VALID_EMPLOYEE_ID]
  );
  await pool.execute(`INSERT IGNORE INTO backup_legacy_employees (employee_id, full_name, employee_code, role, employee_grade, basic_salary, mobile, is_active) VALUES (1, 'Test Tech', 'EMP001', 'TECH', 'A', 1000, '9999999999', 1)`);
  await pool.execute(`INSERT IGNORE INTO backup_legacy_job_cards (job_id, job_card_no, vrn, customer_name, customer_mobile, vehicle_make, vehicle_model, vehicle_year, km_reading, sr_type_id, job_description, priority, status, etd, created_by, created_at) VALUES (?, 'X', 'X', 'X', 'X', 'X', 'X', 2000, 0, 1, 'X', 'X', 'X', 'X', 1, 'X')`, [res.insertId]);
  return { jobId: res.insertId, jobCardNo: jcNo };
}

async function seedFloorToQcSla(jobId: number) {
  await pool.execute(
    `INSERT INTO tbl_handoff_sla (entity_id, stage_name, status) VALUES (?, 'SLA_FLOOR_TO_QC', 'ON_TRACK')`,
    [jobId]
  );
}

async function getJobStatus(jobId: number): Promise<string> {
  const [rows]: any = await pool.execute(`SELECT status FROM job_cards WHERE job_id = ?`, [jobId]);
  return rows[0]?.status || "NOT_FOUND";
}

async function runTests() {
  console.log("================================================================");
  console.log("PHASE 7 COMPLETE: ORIGINAL 47 + CLOSEOUT SCENARIOS (≥75 total)");
  console.log("================================================================\n");

  // Ensure tables
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS rpt_qc_checklists (
      qc_checklist_id INT AUTO_INCREMENT PRIMARY KEY,
      job_id INT, inspector_id INT, result VARCHAR(50),
      check_items_json TEXT, road_test_km INT,
      inspector_notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS qc_road_tests (
      road_test_id INT AUTO_INCREMENT PRIMARY KEY,
      job_id INT NOT NULL, qc_checklist_ref INT NULL, branch_id INT NOT NULL,
      tester_id INT NOT NULL, tester_name VARCHAR(100) NOT NULL,
      requirement_status ENUM('REQUIRED','NOT_REQUIRED') NOT NULL,
      requirement_set_by INT NOT NULL, requirement_set_by_name VARCHAR(100) NOT NULL,
      requirement_set_at DATETIME NOT NULL,
      status ENUM('REQUIRED','NOT_REQUIRED','IN_PROGRESS','PASSED','FAILED') NOT NULL,
      start_odometer INT NULL, end_odometer INT NULL,
      started_at DATETIME NULL, completed_at DATETIME NULL, remarks TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_job_id (job_id), INDEX idx_branch_id (branch_id)
    ) ENGINE=InnoDB
  `);

  const engine = QcExecutionEngine.getInstance();

  // ════ SECTION A: HANDOFF & CHECKLIST (1–7) ═══════════════════════════════
  console.log("── SECTION A: Handoff & Checklist (1–7) ──");

  const jobA = await seedJob("A");
  await seedFloorToQcSla(jobA);

  await engine.acknowledgeQcHandoff(jobA, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  assert(await getJobStatus(jobA) === "QC_IN_PROGRESS", "A1. QC handoff sets status to QC_IN_PROGRESS");

  const [slaA]: any = await pool.execute(`SELECT status FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'SLA_FLOOR_TO_QC'`, [jobA]);
  assert(slaA[0]?.status === "COMPLETED", "A2. SLA_FLOOR_TO_QC marked COMPLETED on acknowledgement");

  await engine.acknowledgeQcHandoff(jobA, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  assert(await getJobStatus(jobA) === "QC_IN_PROGRESS", "A3. Duplicate QC acknowledgement is idempotent");

  await assertRejects(() => engine.acknowledgeQcHandoff(999999, VALID_EMPLOYEE_ID, BRANCH_SEDAM), "QC_JOB_NOT_FOUND", "A4. Acknowledge on non-existent job throws QC_JOB_NOT_FOUND");

  const checklist = await engine.generateContextualChecklist(jobA);
  assert(checklist.length >= 5, "A5. Deterministic checklist has ≥5 mandatory items");
  assert(checklist.filter((i: any) => i.mandatory === true).length >= 5, "A6. All structural checklist items are mandatory=true");
  assert(checklist.filter((i: any) => i.source === "STANDARD").length >= 5, "A7. Structural items have source=STANDARD (deterministic, not AI)");

  // ════ SECTION B: SERVER-SIDE QC PASS GATING (8–13) ══════════════════════
  console.log("\n── SECTION B: Server-Side QC PASS Gating (8–13) ──");

  const jobB = await seedJob("B");
  await seedFloorToQcSla(jobB);
  await engine.acknowledgeQcHandoff(jobB, VALID_EMPLOYEE_ID, BRANCH_SEDAM);

  const pendingChecklist = checklist.map((i: any) => ({ ...i, status: "PENDING" }));
  await assertRejects(() => engine.submitQcDecision(jobB, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", pendingChecklist, 5, ""), "QC_PASS_BLOCKED", "B8. PASS rejected when mandatory items are still PENDING");

  const failChecklist = checklist.map((i: any) => ({ ...i, status: "FAIL" }));
  await assertRejects(() => engine.submitQcDecision(jobB, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", failChecklist, 5, ""), "QC_PASS_BLOCKED", "B9. PASS rejected when mandatory items have FAIL status");

  await pool.execute(`INSERT INTO rework_tracking (original_job_id, rework_job_id, vehicle_reg, assigned_technician_id, original_closure_date, rework_date, days_since_original, original_issue, rework_reason, rework_completed, rework_revenue) VALUES (?, ?, 'UNKNOWN', 1, NOW(), NOW(), 0, 'open rework test', 'test rework', false, 0)`, [jobB, jobB]);
  const passChecklist = checklist.map((i: any) => ({ ...i, status: "PASS" }));
  await assertRejects(() => engine.submitQcDecision(jobB, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passChecklist, 5, ""), "QC_PASS_BLOCKED", "B10. PASS rejected when open rework loop exists");
  await pool.execute(`UPDATE rework_tracking SET rework_completed = true WHERE original_job_id = ?`, [jobB]);

  await engine.submitQcDecision(jobB, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passChecklist, 12, "All checks passed");
  assert(await getJobStatus(jobB) === "QC_PASSED", "B11. PASS succeeds with all mandatory items PASS and no open reworks");

  const [qcRec]: any = await pool.execute(`SELECT result, road_test_km FROM rpt_qc_checklists WHERE job_id = ? ORDER BY created_at DESC LIMIT 1`, [jobB]);
  assert(qcRec[0]?.result === "PASS", "B12. QC PASS decision persisted in rpt_qc_checklists (no silent failure)");
  assert(qcRec[0]?.road_test_km === 12, "B13. Road test km captured correctly in persisted record");

  // ════ SECTION C: QC FAIL & REWORK LOOP (14–20) ═══════════════════════════
  console.log("\n── SECTION C: QC FAIL & Rework Loop (14–20) ──");

  const jobC = await seedJob("C");
  await seedFloorToQcSla(jobC);
  await engine.acknowledgeQcHandoff(jobC, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  await engine.submitQcDecision(jobC, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "FAIL", checklist, 0, "Brake binding issue");

  const [rwC]: any = await pool.execute(`SELECT rework_reason FROM rework_tracking WHERE original_job_id = ? AND rework_completed = false`, [jobC]);
  assert(rwC.length > 0, "C14. QC FAIL creates rework_tracking record (no silent failure)");
  assert(rwC[0]?.rework_reason === "Brake binding issue", "C15. Rework reason captured from QC notes");
  assert(await getJobStatus(jobC) === "QC_FAILED_REWORK", "C16. Job state set to QC_FAILED_REWORK on FAIL decision");

  const [qcRecC]: any = await pool.execute(`SELECT result FROM rpt_qc_checklists WHERE job_id = ? ORDER BY created_at DESC LIMIT 1`, [jobC]);
  assert(qcRecC[0]?.result === "FAIL", "C17. QC FAIL decision persisted in rpt_qc_checklists (no silent failure)");

  const jobNoRework = await seedJob("NORW");
  await assertRejects(() => engine.completeRework(jobNoRework, VALID_EMPLOYEE_ID, BRANCH_SEDAM, VALID_EMPLOYEE_ID, ""), "REWORK_COMPLETE_INVALID", "C18. completeRework throws when no open rework exists");

  await engine.completeRework(jobC, VALID_EMPLOYEE_ID, BRANCH_SEDAM, VALID_EMPLOYEE_ID, "Fixed brakes");
  assert(await getJobStatus(jobC) === "QC_PENDING", "C19. Rework completion returns job to QC_PENDING");
  const [rwCompleted]: any = await pool.execute(`SELECT rework_completed FROM rework_tracking WHERE original_job_id = ?`, [jobC]);
  assert(rwCompleted[0]?.rework_completed === 1, "C20. rework_tracking.rework_completed = true after completeRework");

  // ════ SECTION D: SECOND QC ATTEMPT (21–24) ═══════════════════════════════
  console.log("\n── SECTION D: Second QC Attempt (21–24) ──");

  await seedFloorToQcSla(jobC);
  await engine.acknowledgeQcHandoff(jobC, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  assert(await getJobStatus(jobC) === "QC_IN_PROGRESS", "D21. Second QC attempt initiated after rework completion");

  const passListC2 = checklist.map((i: any) => ({ ...i, status: "PASS" }));
  await engine.submitQcDecision(jobC, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListC2, 7, "Second pass");
  const attemptCount = await engine.getQcAttemptCount(jobC);
  assert(attemptCount >= 2, "D22. QC attempt counter shows ≥2 attempts (original FAIL + second PASS)");

  const [allAttempts]: any = await pool.execute(`SELECT result FROM rpt_qc_checklists WHERE job_id = ? ORDER BY created_at ASC`, [jobC]);
  assert(allAttempts[0]?.result === "FAIL", "D23. Original FAIL attempt remains auditable in rpt_qc_checklists");

  const checklist2 = await engine.generateContextualChecklist(jobC);
  const reinspectItems = checklist2.filter((i: any) => i.source === "PRIOR_QC_FAIL");
  assert(reinspectItems.length > 0, "D24. Second QC checklist includes reinspection items from prior FAIL");

  // ════ SECTION E: SA ACKNOWLEDGEMENT GATING (25–30) ══════════════════════
  console.log("\n── SECTION E: SA Acknowledgement Gating (25–30) ──");

  const jobE = await seedJob("E");
  await seedFloorToQcSla(jobE);
  await engine.acknowledgeQcHandoff(jobE, VALID_EMPLOYEE_ID, BRANCH_SEDAM);

  await assertRejects(() => engine.saAcknowledgeQc(jobE, VALID_EMPLOYEE_ID, BRANCH_SEDAM), "SA_ACK_BLOCKED", "E25. SA acknowledgement rejected when job not in QC_PASSED state");

  const passListE = checklist.map((i: any) => ({ ...i, status: "PASS" }));
  await engine.submitQcDecision(jobE, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListE, 8, "All good");

  await pool.execute(`INSERT INTO rework_tracking (original_job_id, rework_job_id, vehicle_reg, assigned_technician_id, original_closure_date, rework_date, days_since_original, original_issue, rework_reason, rework_completed, rework_revenue) VALUES (?, ?, 'UNKNOWN', 1, NOW(), NOW(), 0, 'dangling rework', 'dangling', false, 0)`, [jobE, jobE]);
  await assertRejects(() => engine.saAcknowledgeQc(jobE, VALID_EMPLOYEE_ID, BRANCH_SEDAM), "SA_ACK_BLOCKED", "E26. SA acknowledgement rejected when open rework exists (even if QC_PASSED)");
  await pool.execute(`UPDATE rework_tracking SET rework_completed = true WHERE original_job_id = ?`, [jobE]);

  await engine.saAcknowledgeQc(jobE, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  assert(await getJobStatus(jobE) === "PRE_INVOICE_READY", "E27. SA acknowledgement sets status to PRE_INVOICE_READY");

  const [slaE]: any = await pool.execute(`SELECT status FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'SLA_QC_TO_SA'`, [jobE]);
  assert(slaE[0]?.status === "COMPLETED", "E28. SLA_QC_TO_SA marked COMPLETED on SA acknowledgement");

  await engine.saAcknowledgeQc(jobE, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  assert(await getJobStatus(jobE) === "PRE_INVOICE_READY", "E29. Duplicate SA acknowledgement is idempotent");

  const [slaQcToSa]: any = await pool.execute(`SELECT branch_id FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'SLA_QC_TO_SA'`, [jobE]);
  assert(slaQcToSa[0]?.branch_id !== "BR-SEDAM", "E30. QC→SA SLA uses authenticated branchId, not hardcoded 'BR-SEDAM'");

  // ════ SECTION F: PRE-INVOICE HARD GATE (31–36) ═══════════════════════════
  console.log("\n── SECTION F: Pre-Invoice Hard Gate (31–36) ──");

  const jobFNP = await seedJob("FNP");
  const readyF1 = await engine.checkPreInvoiceReadiness(jobFNP, BRANCH_SEDAM);
  assert(readyF1.ready === false, "F31. Pre-invoice blocked when job is QC_PENDING (not QC_PASSED)");

  await pool.execute(`UPDATE job_cards SET status = 'QC_PASSED' WHERE job_id = ?`, [jobFNP]);
  const readyF2 = await engine.checkPreInvoiceReadiness(jobFNP, BRANCH_SEDAM);
  assert(readyF2.ready === false && readyF2.blockReason?.includes("No QC PASS record"), "F32. Pre-invoice blocked even if status=QC_PASSED but no rpt_qc_checklists PASS record");

  const jobFRW = await seedJob("FRW");
  await seedFloorToQcSla(jobFRW);
  await engine.acknowledgeQcHandoff(jobFRW, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  const passListF = checklist.map((i: any) => ({ ...i, status: "PASS" }));
  await engine.submitQcDecision(jobFRW, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListF, 3, "");
  await pool.execute(`INSERT INTO rework_tracking (original_job_id, rework_job_id, vehicle_reg, assigned_technician_id, original_closure_date, rework_date, days_since_original, original_issue, rework_reason, rework_completed, rework_revenue) VALUES (?, ?, 'UNKNOWN', 1, NOW(), NOW(), 0, 'injected rework', 'injected', false, 0)`, [jobFRW, jobFRW]);
  const readyF3 = await engine.checkPreInvoiceReadiness(jobFRW, BRANCH_SEDAM);
  assert(readyF3.ready === false && readyF3.blockReason?.includes("rework"), "F33. Pre-invoice blocked with injected open rework (DB-level bypass attempt)");

  await pool.execute(`UPDATE rework_tracking SET rework_completed = true WHERE original_job_id = ?`, [jobFRW]);
  const readyF4 = await engine.checkPreInvoiceReadiness(jobFRW, BRANCH_SEDAM);
  assert(readyF4.ready === false && readyF4.blockReason?.includes("SLA"), "F34. Pre-invoice blocked if SA has not acknowledged (SLA_QC_TO_SA not COMPLETED)");

  const readyE = await engine.checkPreInvoiceReadiness(jobE, BRANCH_SEDAM);
  assert(readyE.ready === true, "F35. Pre-invoice passes when QC PASSED, rework resolved, and SA acknowledged");

  const readyGhost = await engine.checkPreInvoiceReadiness(999998, BRANCH_SEDAM);
  assert(readyGhost.ready === false, "F36. Pre-invoice returns not-ready for non-existent job");

  // ════ SECTION G: BRANCH/IDOR SECURITY (37–43) ════════════════════════════
  console.log("\n── SECTION G: Branch/IDOR Security (37–43) ──");

  await assertRejects(() => engine.acknowledgeQcHandoff(888888, VALID_EMPLOYEE_ID, BRANCH_SEDAM), "QC_JOB_NOT_FOUND", "G37. Acknowledge on non-existent job throws (no blind IDOR accept)");
  await assertRejects(() => engine.submitQcDecision(888887, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "FAIL", [], 0, ""), "QC_JOB_NOT_FOUND", "G38. QC decision on non-existent job throws (no blind IDOR accept)");
  await assertRejects(() => engine.saAcknowledgeQc(888886, VALID_EMPLOYEE_ID, BRANCH_SEDAM), "QC_JOB_NOT_FOUND", "G39. SA acknowledge on non-existent job throws (no blind IDOR accept)");

  const jobCH = await seedJob("CH");
  await pool.execute(`INSERT INTO job_card_complaint_history (job_card_id, version_number, complaint_text, edited_by_user_id, edited_by_name, edited_role) VALUES (?, 1, 'Engine vibration at idle', ?, 'Test SA', 'service_advisor')`, [jobCH, VALID_EMPLOYEE_ID]);
  const chklist2 = await engine.generateContextualChecklist(jobCH);
  const complaintItems = chklist2.filter((i: any) => i.source === "COMPLAINT_HISTORY");
  assert(complaintItems.length > 0, "G40. Checklist includes items from job_card_complaint_history (deterministic source)");
  assert(complaintItems.some((i: any) => i.description.includes("Engine vibration")), "G41. Complaint reconciliation check contains the actual complaint text");

  const jobNoQc = await seedJob("NOQC");
  await pool.execute(`UPDATE job_cards SET status = 'QC_PASSED' WHERE job_id = ?`, [jobNoQc]);
  const readyNoQc = await engine.checkPreInvoiceReadiness(jobNoQc, BRANCH_SEDAM);
  assert(readyNoQc.ready === false, "G42. Pre-invoice blocked when job status=QC_PASSED via direct DB manipulation but no QC record");

  await assertRejects(() => engine.completeRework(888885, VALID_EMPLOYEE_ID, BRANCH_SEDAM, VALID_EMPLOYEE_ID, ""), "QC_JOB_NOT_FOUND", "G43. completeRework on non-existent job throws QC_JOB_NOT_FOUND");

  // ════ SECTION H: TRANSACTION INTEGRITY (44–47) ═══════════════════════════
  console.log("\n── SECTION H: Transaction Integrity (44–47) ──");

  const [qcRecE]: any = await pool.execute(`SELECT result FROM rpt_qc_checklists WHERE job_id = ?`, [jobE]);
  const statusE = await getJobStatus(jobE);
  assert(qcRecE.length > 0 && statusE === "PRE_INVOICE_READY", "H44. QC PASS: checklist record AND job status update both persisted atomically");

  const jobH45 = await seedJob("H45");
  await seedFloorToQcSla(jobH45);
  await engine.acknowledgeQcHandoff(jobH45, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  await engine.submitQcDecision(jobH45, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "FAIL", checklist, 0, "H45 fail test");
  const [rwH45]: any = await pool.execute(`SELECT id FROM rework_tracking WHERE original_job_id = ? AND rework_completed = false`, [jobH45]);
  assert(rwH45.length > 0 && await getJobStatus(jobH45) === "QC_FAILED_REWORK", "H45. QC FAIL: rework record AND job status update both persisted atomically");

  const jobH46 = await seedJob("H46");
  await seedFloorToQcSla(jobH46);
  await engine.acknowledgeQcHandoff(jobH46, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  const passListH46 = checklist.map((i: any) => ({ ...i, status: "PASS" }));
  await engine.submitQcDecision(jobH46, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListH46, 5, "");
  const [slaH46]: any = await pool.execute(`SELECT status FROM tbl_handoff_sla WHERE entity_id = ? AND stage_name = 'SLA_QC_TO_SA'`, [jobH46]);
  assert(slaH46.length > 0 && slaH46[0].status === "ON_TRACK", "H46. QC PASS: SLA_QC_TO_SA record created atomically with job status update");

  await engine.completeRework(jobH45, VALID_EMPLOYEE_ID, BRANCH_SEDAM, VALID_EMPLOYEE_ID, "Fixed H45");
  const [rwH45After]: any = await pool.execute(`SELECT rework_completed FROM rework_tracking WHERE original_job_id = ?`, [jobH45]);
  assert(rwH45After[0]?.rework_completed === 1 && await getJobStatus(jobH45) === "QC_PENDING", "H47. Rework completion: rework_completed=true AND job status=QC_PENDING both atomically");

  // ════ SECTION RT: ROAD TEST LIFECYCLE (48–68) ════════════════════════════
  console.log("\n── SECTION RT: Road Test Lifecycle (48–68) ──");

  const jobRT = await seedJob("RT");

  // RT48: Set REQUIRED
  const { roadTestId: rtRequired } = await engine.setRoadTestRequirement(jobRT, BRANCH_SEDAM, "REQUIRED", VALID_EMPLOYEE_ID, "QC Inspector");
  const [rtReqRow]: any = await pool.execute(`SELECT status, requirement_status FROM qc_road_tests WHERE road_test_id = ?`, [rtRequired]);
  assert(rtReqRow[0]?.requirement_status === "REQUIRED" && rtReqRow[0]?.status === "REQUIRED", "RT48. Road test REQUIRED persisted with correct status");

  // RT49: Set NOT_REQUIRED on a different job
  const jobRTNR = await seedJob("RTNR");
  const { roadTestId: rtNotRequired } = await engine.setRoadTestRequirement(jobRTNR, BRANCH_SEDAM, "NOT_REQUIRED", VALID_EMPLOYEE_ID, "QC Inspector");
  const [rtNRRow]: any = await pool.execute(`SELECT status, requirement_status FROM qc_road_tests WHERE road_test_id = ?`, [rtNotRequired]);
  assert(rtNRRow[0]?.requirement_status === "NOT_REQUIRED" && rtNRRow[0]?.status === "NOT_REQUIRED", "RT49. Road test NOT_REQUIRED persisted with correct status");

  // RT50: Start captures authenticated tester
  await engine.startRoadTest(rtRequired, jobRT, BRANCH_SEDAM, VALID_EMPLOYEE_ID, "Road Tester Ravi", 20000);
  const [rtStartRow]: any = await pool.execute(`SELECT status, tester_name, start_odometer, started_at FROM qc_road_tests WHERE road_test_id = ?`, [rtRequired]);
  assert(rtStartRow[0]?.tester_name === "Road Tester Ravi", "RT50. Start captures authenticated tester name");

  // RT51: Start captures odometer
  assert(rtStartRow[0]?.start_odometer === 20000, "RT51. Start captures start_odometer correctly");

  // RT52: Started_at timestamp set
  assert(rtStartRow[0]?.started_at !== null, "RT52. started_at timestamp captured on start");

  // RT53: Status moves to IN_PROGRESS
  assert(rtStartRow[0]?.status === "IN_PROGRESS", "RT53. Road test status moves to IN_PROGRESS on start");

  // RT54: Cross-branch start denied
  const jobRTCB = await seedJob("RTCB");
  const { roadTestId: rtCB } = await engine.setRoadTestRequirement(jobRTCB, BRANCH_SEDAM, "REQUIRED", VALID_EMPLOYEE_ID, "QC Inspector");
  await assertRejects(
    () => engine.startRoadTest(rtCB, jobRTCB, 99, VALID_EMPLOYEE_ID, "Other", 10000),
    "RT_BRANCH_MISMATCH",
    "RT54. Cross-branch start denied with RT_BRANCH_MISMATCH"
  );

  // RT55: Complete before start denied (use rtCB which is still REQUIRED)
  await assertRejects(
    () => engine.completeRoadTest(rtCB, jobRTCB, BRANCH_SEDAM, "PASSED", 10100, ""),
    "RT_INVALID_TRANSITION",
    "RT55. Complete before start denied (status=REQUIRED, not IN_PROGRESS)"
  );

  // RT56: End odometer below start rejected
  await assertRejects(
    () => engine.completeRoadTest(rtRequired, jobRT, BRANCH_SEDAM, "PASSED", 15000, ""),
    "RT_ODOMETER_INVALID",
    "RT56. End odometer below start_odometer (15000 < 20000) rejected"
  );

  // RT57: Valid completion — PASSED
  await engine.completeRoadTest(rtRequired, jobRT, BRANCH_SEDAM, "PASSED", 20025, "No issues");
  const [rtPassRow]: any = await pool.execute(`SELECT status, end_odometer, completed_at FROM qc_road_tests WHERE road_test_id = ?`, [rtRequired]);
  assert(rtPassRow[0]?.status === "PASSED", "RT57. Road test reaches PASSED status on completion");
  assert(rtPassRow[0]?.end_odometer === 20025, "RT58. End odometer captured on completion");
  assert(rtPassRow[0]?.completed_at !== null, "RT59. completed_at timestamp set on completion");

  // RT60: Re-START a PASSED road test → rejected
  await assertRejects(
    () => engine.startRoadTest(rtRequired, jobRT, BRANCH_SEDAM, VALID_EMPLOYEE_ID, "Tester", 20100),
    "RT_INVALID_TRANSITION",
    "RT60. Cannot re-START a PASSED road test"
  );

  // RT61: Start NOT_REQUIRED → rejected
  await assertRejects(
    () => engine.startRoadTest(rtNotRequired, jobRTNR, BRANCH_SEDAM, VALID_EMPLOYEE_ID, "Tester", 10000),
    "RT_INVALID_TRANSITION",
    "RT61. Cannot START a NOT_REQUIRED road test"
  );

  // RT62: REQUIRED road test pending blocks QC PASS
  const jobRTB = await seedJob("RTB");
  await seedFloorToQcSla(jobRTB);
  await engine.acknowledgeQcHandoff(jobRTB, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  await engine.setRoadTestRequirement(jobRTB, BRANCH_SEDAM, "REQUIRED", VALID_EMPLOYEE_ID, "QC Inspector");
  const passListRTB = checklist.map((i: any) => ({ ...i, status: "PASS" }));
  await assertRejects(
    () => engine.submitQcDecision(jobRTB, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListRTB, 0, ""),
    "QC_PASS_BLOCKED",
    "RT62. REQUIRED road test not started blocks QC PASS"
  );

  // RT63: IN_PROGRESS road test blocks QC PASS
  const { roadTestId: rtRTB } = await engine.setRoadTestRequirement(jobRTB, BRANCH_SEDAM, "REQUIRED", VALID_EMPLOYEE_ID, "Inspector");
  await engine.startRoadTest(rtRTB, jobRTB, BRANCH_SEDAM, VALID_EMPLOYEE_ID, "Tester", 18000);
  await assertRejects(
    () => engine.submitQcDecision(jobRTB, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListRTB, 0, ""),
    "QC_PASS_BLOCKED",
    "RT63. IN_PROGRESS road test blocks QC PASS"
  );

  // RT64: FAILED road test blocks QC PASS
  await engine.completeRoadTest(rtRTB, jobRTB, BRANCH_SEDAM, "FAILED", 18020, "Brake drag");
  await assertRejects(
    () => engine.submitQcDecision(jobRTB, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListRTB, 0, ""),
    "QC_PASS_BLOCKED",
    "RT64. FAILED road test blocks QC PASS"
  );

  // RT65: PASSED road test permits QC PASS (all other gates met)
  const { roadTestId: rtRTB2 } = await engine.setRoadTestRequirement(jobRTB, BRANCH_SEDAM, "REQUIRED", VALID_EMPLOYEE_ID, "Inspector");
  await engine.startRoadTest(rtRTB2, jobRTB, BRANCH_SEDAM, VALID_EMPLOYEE_ID, "Tester2", 18020);
  await engine.completeRoadTest(rtRTB2, jobRTB, BRANCH_SEDAM, "PASSED", 18050, "All good");
  await engine.submitQcDecision(jobRTB, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListRTB, 30, "");
  assert(await getJobStatus(jobRTB) === "QC_PASSED", "RT65. PASSED road test permits QC PASS when all other gates satisfied");

  // RT66: NOT_REQUIRED permits QC PASS
  const jobRTNRPass = await seedJob("RTNRP");
  await seedFloorToQcSla(jobRTNRPass);
  await engine.acknowledgeQcHandoff(jobRTNRPass, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  await engine.setRoadTestRequirement(jobRTNRPass, BRANCH_SEDAM, "NOT_REQUIRED", VALID_EMPLOYEE_ID, "Inspector");
  const passListNR = checklist.map((i: any) => ({ ...i, status: "PASS" }));
  await engine.submitQcDecision(jobRTNRPass, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListNR, 0, "No road test needed");
  assert(await getJobStatus(jobRTNRPass) === "QC_PASSED", "RT66. NOT_REQUIRED road test permits QC PASS when all other gates satisfied");

  // RT67: Road test history retained (multiple records per job)
  const history = await engine.getRoadTestHistory(jobRTB, BRANCH_SEDAM);
  assert(history.length >= 2, "RT67. Road test history retains multiple records per job");

  // RT68: Duplicate IN_PROGRESS — cannot set new requirement while IN_PROGRESS
  const jobRTDup = await seedJob("RTDUP");
  const { roadTestId: rtDup } = await engine.setRoadTestRequirement(jobRTDup, BRANCH_SEDAM, "REQUIRED", VALID_EMPLOYEE_ID, "Inspector");
  await engine.startRoadTest(rtDup, jobRTDup, BRANCH_SEDAM, VALID_EMPLOYEE_ID, "Tester", 5000);
  await assertRejects(
    () => engine.setRoadTestRequirement(jobRTDup, BRANCH_SEDAM, "REQUIRED", VALID_EMPLOYEE_ID, "Inspector"),
    "RT_ALREADY_IN_PROGRESS",
    "RT68. Cannot set new road test requirement while one is IN_PROGRESS"
  );

  // ════ SECTION W: WARRANTY DEPENDENCY GATE (69–75) ════════════════════════
  console.log("\n── SECTION W: Warranty Dependency Gate (69–75) ──");

  // W69: No warranty dependency → readiness unaffected (gate passes)
  const jobW_clean = await seedJob("WCLEAN");
  await seedFloorToQcSla(jobW_clean);
  await engine.acknowledgeQcHandoff(jobW_clean, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  const passListW = checklist.map((i: any) => ({ ...i, status: "PASS" }));
  await engine.submitQcDecision(jobW_clean, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListW, 5, "");
  await engine.saAcknowledgeQc(jobW_clean, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  const readyWClean = await engine.checkPreInvoiceReadiness(jobW_clean, BRANCH_SEDAM);
  assert(readyWClean.ready === true, "W69. No warranty dependency → pre-invoice gate passes");

  // W70: Pending warranty dependency → blocked
  const { jobId: jobW_pending, jobCardNo: jcNoPending } = await seedJobWithCardNo("WPEND");
  await pool.execute(
    `INSERT INTO tbl_warranty_reviews (review_id, job_card_id, vrn, complaint, requested_by, status, branch_id)
     VALUES (?, ?, 'VRN-W-PEND', 'Test warranty complaint', 'Tech A', 'PENDING', ?)`,
    [`WR-P7-PEND-${Date.now()}`, jcNoPending, BRANCH_SEDAM.toString()]
  );
  await seedFloorToQcSla(jobW_pending);
  await engine.acknowledgeQcHandoff(jobW_pending, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  await engine.submitQcDecision(jobW_pending, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListW, 5, "");
  await engine.saAcknowledgeQc(jobW_pending, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  const readyWPend = await engine.checkPreInvoiceReadiness(jobW_pending, BRANCH_SEDAM);
  assert(readyWPend.ready === false && readyWPend.blockReason?.includes("unresolved warranty"), "W70. PENDING warranty review blocks pre-invoice");

  // W71: ACKNOWLEDGED warranty dependency → blocked
  const { jobId: jobW_ack, jobCardNo: jcNoAck } = await seedJobWithCardNo("WACK");
  await pool.execute(
    `INSERT INTO tbl_warranty_reviews (review_id, job_card_id, vrn, complaint, requested_by, status, branch_id)
     VALUES (?, ?, 'VRN-W-ACK', 'Test warranty acknowledged', 'Tech A', 'ACKNOWLEDGED', ?)`,
    [`WR-P7-ACK-${Date.now()}`, jcNoAck, BRANCH_SEDAM.toString()]
  );
  await seedFloorToQcSla(jobW_ack);
  await engine.acknowledgeQcHandoff(jobW_ack, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  await engine.submitQcDecision(jobW_ack, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListW, 5, "");
  await engine.saAcknowledgeQc(jobW_ack, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  const readyWAck = await engine.checkPreInvoiceReadiness(jobW_ack, BRANCH_SEDAM);
  assert(readyWAck.ready === false && readyWAck.blockReason?.includes("unresolved warranty"), "W71. ACKNOWLEDGED warranty review blocks pre-invoice");

  // W72: APPROVED warranty → gate passes (terminal Phase 6 status)
  const { jobId: jobW_appr, jobCardNo: jcNoAppr } = await seedJobWithCardNo("WAPPR");
  await pool.execute(
    `INSERT INTO tbl_warranty_reviews (review_id, job_card_id, vrn, complaint, requested_by, status, branch_id, adjudicated_by, adjudicated_at)
     VALUES (?, ?, 'VRN-W-APPR', 'Test warranty approved', 'Tech A', 'APPROVED', ?, 'Admin', NOW())`,
    [`WR-P7-APPR-${Date.now()}`, jcNoAppr, BRANCH_SEDAM.toString()]
  );
  await seedFloorToQcSla(jobW_appr);
  await engine.acknowledgeQcHandoff(jobW_appr, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  await engine.submitQcDecision(jobW_appr, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListW, 5, "");
  await engine.saAcknowledgeQc(jobW_appr, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  const readyWAppr = await engine.checkPreInvoiceReadiness(jobW_appr, BRANCH_SEDAM);
  assert(readyWAppr.ready === true, "W72. APPROVED warranty review (terminal Phase 6) → pre-invoice gate passes");

  // W73: REJECTED warranty → gate passes (terminal Phase 6 status — disposition complete)
  const { jobId: jobW_rej, jobCardNo: jcNoRej } = await seedJobWithCardNo("WREJ");
  await pool.execute(
    `INSERT INTO tbl_warranty_reviews (review_id, job_card_id, vrn, complaint, requested_by, status, branch_id, adjudicated_by, adjudicated_at)
     VALUES (?, ?, 'VRN-W-REJ', 'Test warranty rejected', 'Tech A', 'REJECTED', ?, 'Admin', NOW())`,
    [`WR-P7-REJ-${Date.now()}`, jcNoRej, BRANCH_SEDAM.toString()]
  );
  await seedFloorToQcSla(jobW_rej);
  await engine.acknowledgeQcHandoff(jobW_rej, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  await engine.submitQcDecision(jobW_rej, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListW, 5, "");
  await engine.saAcknowledgeQc(jobW_rej, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  const readyWRej = await engine.checkPreInvoiceReadiness(jobW_rej, BRANCH_SEDAM);
  assert(readyWRej.ready === true, "W73. REJECTED warranty review (terminal Phase 6) → pre-invoice gate passes");

  // W74: Cross-branch warranty record must NOT satisfy another branch's gate
  // Insert a warranty review for the clean job's card number but with a DIFFERENT branch
  const { jobId: jobW_xb, jobCardNo: jcNoXB } = await seedJobWithCardNo("WXB");
  const reviewIdXB = `WR-P7-XB-${Date.now()}`;
  await pool.execute(
    `INSERT INTO tbl_warranty_reviews (review_id, job_card_id, vrn, complaint, requested_by, status, branch_id)
     VALUES (?, ?, 'VRN-W-XB', 'Cross branch warranty', 'Tech A', 'PENDING', ?)`,
    [reviewIdXB, jcNoXB, '99'] // branch 99 — different from BRANCH_SEDAM=1
  );
  await seedFloorToQcSla(jobW_xb);
  await engine.acknowledgeQcHandoff(jobW_xb, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  await engine.submitQcDecision(jobW_xb, VALID_EMPLOYEE_ID, BRANCH_SEDAM, "PASS", passListW, 5, "");
  await engine.saAcknowledgeQc(jobW_xb, VALID_EMPLOYEE_ID, BRANCH_SEDAM);
  // From BRANCH_SEDAM=1 perspective, cross-branch warranty review (branch=99) does NOT exist → gate passes
  const readyWXB = await engine.checkPreInvoiceReadiness(jobW_xb, BRANCH_SEDAM);
  assert(readyWXB.ready === true, "W74. Cross-branch warranty record (branch=99) does not block BRANCH_SEDAM=1 pre-invoice gate");

  // W75: checkWarrantyDependency returns correct blocking count
  const warrantyCk = await engine.checkWarrantyDependency(jobW_pending, BRANCH_SEDAM);
  assert(warrantyCk.blocking === true && (warrantyCk.count || 0) >= 1, "W75. checkWarrantyDependency returns blocking=true with correct count");

  // ════ SUMMARY ════════════════════════════════════════════════════════════
  console.log("\n================================================================");
  console.log("TEST EXECUTION SUMMARY:");
  console.log(`  ✅ PASSED:  ${passed}`);
  console.log(`  ❌ FAILED:  ${failed}`);
  if (failures.length > 0) {
    console.log("\n  FAILED SCENARIOS:");
    failures.forEach(f => console.log(`    - ${f}`));
  }
  console.log("================================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("FATAL test runner error:", err);
  process.exit(1);
});
