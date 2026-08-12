// =============================================================================
// WOS Workflow & Reception Integration Test Suite (Phase 7.1I)
// Execution: npx tsx src/tests/workflow-reception-integration.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { EventBus } from "../core/event-bus";
import { WorkflowEngine } from "../engines/workflow/engine";
import { ReceptionWorkflowIntegration } from "../engines/workflow/reception-integration";

// Mock Database Emulator
const mockDb = {
  job_cards: [] as any[],
  tbl_workflow_history: [] as any[],
  tbl_audit_trail: [] as any[],
  tbl_decision_log: [] as any[],
  tbl_notifications: [] as any[],
};

db.execute = (async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO job_cards")) {
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
    return [{ insertId: Date.now() }];
  }

  if (query.startsWith("SELECT * FROM job_cards")) {
    const jobId = params[0];
    const match = mockDb.job_cards.filter((j) => j.job_id === jobId);
    return [match];
  }

  if (query.startsWith("SELECT transition_time FROM tbl_workflow_history")) {
    return [[]];
  }

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

  if (query.startsWith("INSERT INTO tbl_workflow_history")) {
    mockDb.tbl_workflow_history.push({
      job_id: params[0],
      old_state: params[1],
      new_state: params[2],
      queue: params[3],
      sla_status: params[4],
      duration: params[7],
      reason: params[8]
    });
    return [{ insertId: Date.now() }];
  }

  if (query.startsWith("INSERT INTO tbl_audit_trail")) {
    mockDb.tbl_audit_trail.push({
      entity_type: params[0],
      entity_id: params[1],
      action_code: params[2],
      payload_diff: params[3],
      user_id: params[4]
    });
    return [{ insertId: Date.now() }];
  }

  if (query.startsWith("INSERT INTO tbl_notifications")) {
    mockDb.tbl_notifications.push({
      user_id: params[0],
      notification_type: params[1],
      message: params[2],
      priority: params[3]
    });
    return [{ insertId: Date.now() }];
  }

  return [[]];
}) as any;

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING WORKFLOW & RECEPTION INTEGRATION TESTS");
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

  const bus = new EventBus();
  const integration = new ReceptionWorkflowIntegration(bus);

  const firedEvents: string[] = [];
  bus.subscribe("*", (envelope) => {
    firedEvents.push(envelope.topic);
  });

  const correlationId = "CORR-RECEPTION-TEST-1";
  const TEST_JOB_ID = 12345;

  // Pre-seed mock database with the Job Card that Workflow Engine will try to transition
  mockDb.job_cards.push({
    job_id: TEST_JOB_ID,
    job_card_no: "JC-TEST-12345",
    vrn: "MH12AB9090",
    customer_name: "John Doe",
    customer_mobile: "9988776655",
    created_by: 99,
    current_workflow_state: "GATE_IN",
    current_queue: "INTAKE_QUEUE",
    status: "Waiting"
  });

  // 1. Run Vehicle Received Integration
  console.log("\n--- Testing Vehicle Registration Event ---");
  await integration.registerVehicle({
    vrn: "MH12AB9090",
    make: "Tata Motors",
    model: "Nexon EV",
    customerId: 456
  }, correlationId);

  assert(firedEvents.includes("VEHICLE_RECEIVED"), "Event VEHICLE_RECEIVED fired correctly");

  // 2. Run Job Card Creation Integration (Calls Workflow Engine transition to GATE_IN)
  console.log("\n--- Testing Job Card Creation & Workflow Transition ---");
  await integration.createJobCard({
    job_id: TEST_JOB_ID,
    job_card_no: "JC-TEST-12345",
    created_by: 99,
    vrn: "MH12AB9090",
    customer_name: "John Doe",
    customer_mobile: "9988776655"
  }, correlationId);

  // Assert events propagation
  assert(firedEvents.includes("JOB_CARD_CREATED"), "Event JOB_CARD_CREATED fired correctly");
  assert(firedEvents.includes("QUEUE_UPDATED"), "Event QUEUE_UPDATED fired correctly");
  assert(firedEvents.includes("TIMELINE_APPENDED"), "Event TIMELINE_APPENDED fired correctly");
  assert(firedEvents.includes("AUDIT_LOGGED"), "Event AUDIT_LOGGED fired correctly");
  assert(firedEvents.includes("NOTIFICATION_CREATED"), "Event NOTIFICATION_CREATED fired correctly");

  // Assert state changes in Mock Database
  const job = mockDb.job_cards.find(j => j.job_id === TEST_JOB_ID);
  assert(job.current_workflow_state === "INTAKE_PENDING", "Workflow state successfully initialized to INTAKE_PENDING");
  assert(job.current_queue === "INTAKE_QUEUE", "Queue updated successfully to INTAKE_QUEUE");


  // Assert appends
  assert(mockDb.tbl_workflow_history.length > 0, "Workflow history row successfully recorded");
  assert(mockDb.tbl_audit_trail.length > 0, "Audit trail successfully logged");

  console.log("\n=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  db.end();
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
