// =============================================================================
// WOS Workflow Engine Test Suites (Phase 4)
// Execution: npx tsx src/tests/workflow-engine.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { WorkflowValidator } from "../engines/workflow/validator";
import { SlaEngine } from "../engines/workflow/sla";
import { WorkflowEngine } from "../engines/workflow/engine";
import { WorkflowEventPublisher } from "../engines/workflow/event-publisher";
import { WorkflowLogger } from "../engines/workflow/logger";

// ═══════════════════════════════════════════════════════════════════
// DATABASE MOCK EMULATOR (Monkey-patch for offline validation safety)
// ═══════════════════════════════════════════════════════════════════
const mockDb = {
  job_cards: [] as any[],
  tbl_workflow_history: [] as any[],
  tbl_audit_trail: [] as any[],
  tbl_decision_log: [] as any[],
  tbl_notifications: [] as any[],
};

// Monkey-patch db.execute to intercept and run against mock memory tables
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  // 1. DELETE queries
  if (query.startsWith("DELETE FROM")) {
    const tableName = query.split(" ")[2];
    if (tableName in mockDb) {
      (mockDb as any)[tableName] = [];
    }
    return [[]];
  }

  // 2. INSERT queries
  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2];
    if (tableName === "job_cards") {
      mockDb.job_cards.push({
        job_id: params[0],
        job_card_no: params[1],
        vrn: params[2],
        customer_name: params[3],
        customer_mobile: params[4],
        vehicle_make: params[5],
        vehicle_model: params[6],
        vehicle_year: params[7],
        km_reading: params[8],
        sr_type_id: params[9],
        job_description: params[10],
        priority: params[11],
        status: params[12],
        etd: params[13],
        created_by: params[14],
        current_workflow_state: params[15],
        current_queue: params[16],
        sla_status: params[17],
        rework_count: 0,
      });
    } else if (tableName === "tbl_workflow_history") {
      mockDb.tbl_workflow_history.push({
        job_id: params[0],
        old_state: params[1],
        new_state: params[2],
        queue: params[3],
        sla_status: params[4],
        etd: params[5],
        transition_by: params[6],
        transition_time: new Date(),
        duration: params[7],
        reason: params[8],
      });
    } else if (tableName === "tbl_audit_trail") {
      mockDb.tbl_audit_trail.push({
        entity_type: params[0],
        entity_id: params[1],
        action_code: params[2],
        payload_diff: params[3],
        user_id: params[4],
      });
    } else if (tableName === "tbl_decision_log") {
      mockDb.tbl_decision_log.push({
        job_id: params[0],
        decision_type: params[1],
        entity_type: params[2],
        entity_id: params[3],
        ai_recommended_value: params[4],
        actual_selected_value: params[5],
        override_flag: params[6],
        reason_code: params[7],
        justification: params[8],
        actor_id: params[9],
      });
    } else if (tableName === "tbl_notifications") {
      mockDb.tbl_notifications.push({
        user_id: params[0],
        notification_type: params[1],
        message: params[2],
        priority: params[3],
        related_job_id: params[4],
      });
    }
    return [{ insertId: Date.now() }];
  }

  // 3. SELECT queries
  if (query.startsWith("SELECT * FROM job_cards")) {
    const jobId = params[0];
    const match = mockDb.job_cards.filter((j) => j.job_id === jobId);
    return [match];
  }

  if (query.startsWith("SELECT transition_time FROM tbl_workflow_history")) {
    const jobId = params[0];
    const match = mockDb.tbl_workflow_history
      .filter((h) => h.job_id === jobId)
      .sort((a, b) => b.transition_time.getTime() - a.transition_time.getTime());
    return [match];
  }

  // 4. UPDATE queries
  if (query.startsWith("UPDATE job_cards SET current_workflow_state")) {
    const newState = params[0];
    const newQueue = params[1];
    const newSla = params[2];
    const newStatus = params[3];
    const jobId = params[4];

    const job = mockDb.job_cards.find((j) => j.job_id === jobId);
    if (job) {
      job.current_workflow_state = newState;
      job.current_queue = newQueue;
      job.sla_status = newSla;
      job.status = newStatus;
    }
    return [[]];
  }

  if (query.startsWith("UPDATE job_cards SET rework_count = rework_count + 1")) {
    const jobId = params[0];
    const job = mockDb.job_cards.find((j) => j.job_id === jobId);
    if (job) {
      job.rework_count = (job.rework_count || 0) + 1;
    }
    return [[]];
  }

  return [[]];
};

const logContext = WorkflowLogger.createSession(999, "Admin", 9999);

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING WORKFLOW ENGINE TEST SUITES (EMULATOR MODE)");
  console.log("=============================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. UNIT TEST SUITE
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Unit Test Suite ---");
  
  // Test valid transition rules
  const val1 = WorkflowValidator.validate("GATE_IN", "INTAKE_PENDING", "Service Advisor", logContext);
  assert(val1.isValid === true, "Valid transition GATE_IN -> INTAKE_PENDING (Advisor)");

  // Test invalid transition rules
  const val2 = WorkflowValidator.validate("GATE_IN", "WIP_START", "Technician", logContext);
  assert(val2.isValid === false, "Invalid transition GATE_IN -> WIP_START (Blocked)");
  assert(val2.isOverrideRequired === true, "Transition block flags override requirement");

  // Test invalid role permissions
  const val3 = WorkflowValidator.validate("INTAKE_PENDING", "DIAGNOSTIC_WIP", "Security", logContext);
  assert(val3.isValid === false && val3.reason!.includes("Security"), "Invalid role validation rules (Security cannot start Diagnostics)");

  // Test SLA Engine
  const enteredTime = new Date(Date.now() - 40 * 60 * 1000); // 40 mins ago
  const slaCheck = SlaEngine.checkSla("INTAKE_PENDING", enteredTime, logContext);
  assert(slaCheck.status === "BREACHED" && slaCheck.elapsedMinutes >= 40, "SLA Breached status verified after 40 minutes");

  const warningTime = new Date(Date.now() - 25 * 60 * 1000); // 25 mins ago
  const slaCheckWarn = SlaEngine.checkSla("INTAKE_PENDING", warningTime, logContext);
  assert(slaCheckWarn.status === "WARN", "SLA Warning status verified after 25 minutes");


  // ═══════════════════════════════════════════════════════════════════
  // 2. INTEGRITY & DATA SETUP (FOR INTEGRATION & REGRESSION)
  // ═══════════════════════════════════════════════════════════════════
  const TEST_JOB_ID = 9999;
  
  await db.execute("DELETE FROM tbl_workflow_history WHERE job_id = ?", [TEST_JOB_ID]);
  await db.execute("DELETE FROM tbl_audit_trail WHERE entity_id = ?", [TEST_JOB_ID]);
  await db.execute("DELETE FROM tbl_decision_log WHERE job_id = ?", [TEST_JOB_ID]);
  await db.execute("DELETE FROM tbl_notifications WHERE related_job_id = ?", [TEST_JOB_ID]);
  await db.execute("DELETE FROM job_cards WHERE job_id = ?", [TEST_JOB_ID]);

  // Insert clean mock job card for operational test
  await db.execute(
    `INSERT INTO job_cards 
     (job_id, job_card_no, vrn, customer_name, customer_mobile, vehicle_make, vehicle_model, vehicle_year, km_reading, sr_type_id, job_description, priority, status, etd, created_by, current_workflow_state, current_queue, sla_status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      TEST_JOB_ID,
      "JC-TEST-001",
      "MH12AB1234",
      "Test Customer",
      "9876543210",
      "Tata",
      "Nexon EV",
      2024,
      15000,
      1,
      "Scheduled check",
      "Medium",
      "Unassigned",
      "2026-07-10 18:00:00",
      999,
      "GATE_IN",
      "INTAKE_QUEUE",
      "WITHIN_SLA",
    ]
  );

  // ═══════════════════════════════════════════════════════════════════
  // 3. INTEGRATION TEST SUITE
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Integration Test Suite ---");

  // Observer event subscription test
  let eventFired = false;
  WorkflowEventPublisher.subscribe("INTAKE_PENDING", (evt) => {
    if (evt.jobId === TEST_JOB_ID) eventFired = true;
  });

  // Execute transition
  const res1 = await WorkflowEngine.transition({
    jobId: TEST_JOB_ID,
    newState: "INTAKE_PENDING",
    actorId: 999,
    actorRole: "Service Advisor",
  });

  assert(res1.success === true, "Transition execution GATE_IN -> INTAKE_PENDING successful");
  assert(eventFired === true, "Domain event published and handled by subscriber");

  // Verify database updates
  const histRows = mockDb.tbl_workflow_history.filter((h) => h.job_id === TEST_JOB_ID);
  assert(histRows.length === 1 && histRows[0].new_state === "INTAKE_PENDING", "Workflow transition history row appended");

  const auditRows = mockDb.tbl_audit_trail.filter((a) => a.entity_id === TEST_JOB_ID);
  assert(auditRows.length === 1, "Polymorphic audit trail row appended");

  // Test manager override execution
  const resOverride = await WorkflowEngine.transition({
    jobId: TEST_JOB_ID,
    newState: "QC_PENDING", // Invalid transition, skips WIP steps
    actorId: 100,
    actorRole: "Supervisor",
    overrideFlag: true,
    overrideReasonCode: "URGENT_BYPASS",
    overrideJustification: "Bypass requested by dealership head.",
  });

  assert(resOverride.success === true, "Supervisor override execution bypasses state limits");

  const decRows = mockDb.tbl_decision_log.filter((d) => d.job_id === TEST_JOB_ID);
  assert(decRows.length === 1 && decRows[0].reason_code === "URGENT_BYPASS", "Override logged to decision log table");


  // ═══════════════════════════════════════════════════════════════════
  // 4. REGRESSION TEST SUITE (BACKWARD COMPATIBILITY)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Regression Test Suite ---");

  const updatedJob = mockDb.job_cards.find((j) => j.job_id === TEST_JOB_ID);

  // Verify that the new columns didn't corrupt the legacy status column
  assert(updatedJob.status === "Completed", "Job status column mapped ('Completed' for QC_PENDING)");
  assert(updatedJob.rework_count === 0, "Rework count preserved backward status default");


  // ═══════════════════════════════════════════════════════════════════
  // 5. SIMULATION TEST SUITE (OPERATIONAL RUNS)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Simulation Test Suite ---");

  // Simulate QC Failed loop
  const resQcFail = await WorkflowEngine.transition({
    jobId: TEST_JOB_ID,
    newState: "QC_FAILED",
    actorId: 200,
    actorRole: "QC Inspector",
  });

  assert(resQcFail.success === true, "Workflow QC failed transition executed successfully");

  const jobQc = mockDb.job_cards.find((j) => j.job_id === TEST_JOB_ID);
  assert(jobQc.rework_count === 1, "Rework cycle counter successfully incremented");

  const notifRows = mockDb.tbl_notifications.filter((n) => n.related_job_id === TEST_JOB_ID);
  assert(notifRows.length === 1 && notifRows[0].notification_type === "QC_FAILED", "SMS/notification queued for supervisor");

  console.log("\n=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  db.end(); // close db pool
}

runTestSuite();
