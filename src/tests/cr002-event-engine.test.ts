// =============================================================================
// CR-002: Operational Event Engine Unit and Integration Tests (Milestone M1)
// Execution: npx tsx src/tests/cr002-event-engine.test.ts
// =============================================================================

import {
  OperationalEventRepository,
  OperationalEventService,
  LiveTatService,
  ReplayEngine,
  ALLOWED_SOURCES,
  OperationalEvent
} from "../core/event-engine";
import { EventBus } from "../core/event-bus";

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING CR-002 OPERATIONAL EVENT ENGINE TEST SUITE");
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

  // 1. Setup Mock Database
  const mockDbStorage: any[] = [];
  const mockDb = {
    execute: async (sql: string, params?: any[]) => {
      const sqlLower = sql.toLowerCase().trim();
      if (sqlLower.includes("insert into tbl_workflow_history")) {
        // Mock insert
        const event: any = {
          job_id: params?.[0],
          old_state: params?.[1],
          new_state: params?.[2],
          queue: params?.[3],
          sla_status: params?.[4],
          etd: params?.[5],
          transition_by: params?.[6],
          duration: params?.[7],
          reason: params?.[8],
          event_id: params?.[9],
          correlation_id: params?.[10],
          parent_event_id: params?.[11],
          sequence_number: params?.[12],
          source_system: params?.[13],
          event_version: params?.[14],
          event_status: params?.[15],
          event_category: params?.[16],
          source: params?.[17],
          event_type: params?.[18],
          user: params?.[19],
          role: params?.[20],
          workshop_id: params?.[21],
          payload: params?.[22],
          transition_time: new Date().toISOString() // Mock timestamp
        };
        mockDbStorage.push(event);
        return [ { affectedRows: 1 } ];
      }
      if (sqlLower.includes("select * from tbl_workflow_history")) {
        const jobId = params?.[0];
        const rows = mockDbStorage.filter((e) => e.job_id === jobId);
        return [ rows ];
      }
      if (sqlLower.includes("select count(*) as count from tbl_workflow_history")) {
        const jobId = params?.[0];
        const count = mockDbStorage.filter((e) => e.job_id === jobId).length;
        return [ [ { count } ] ];
      }
      throw new Error(`Unexpected query in mock: ${sql}`);
    }
  };

  const eventBus = new EventBus();
  const repo = new OperationalEventRepository(mockDb);
  const service = new OperationalEventService(repo, eventBus);

  // --- TEST 1: Source Validation Constraints ---
  try {
    await service.publish({
      job_id: 1,
      job_card_no: "JC001",
      user: "Advisor-1",
      role: "Service Advisor",
      workshop_id: 1,
      source: "INVALID_SOURCE" as any, // Should trigger error
      event_category: "Operational",
      event_type: "VEHICLE_GATE_IN",
      correlation_id: "CORR-001",
      source_system: "WMS-Core"
    });
    assert(false, "Should have thrown validation error on invalid event source");
  } catch (err: any) {
    assert(err.message.includes("Invalid event source"), "Validation blocks free-text sources");
  }

  // --- TEST 2: Clock Internal UTC Validation ---
  const initialTime = new Date().getTime();
  const testEvent = await service.publish({
    job_id: 1,
    job_card_no: "JC001",
    user: "Advisor-1",
    role: "Service Advisor",
    workshop_id: 1,
    source: "MANUAL",
    event_category: "Operational",
    event_type: "VEHICLE_GATE_IN",
    correlation_id: "CORR-001",
    source_system: "WMS-Core"
  });
  const eventTime = new Date(testEvent.timestamp).getTime();
  assert(
    eventTime >= initialTime && testEvent.timestamp.endsWith("Z"),
    "All timestamps use internal UTC format (ends with Z)"
  );

  // --- TEST 3: Full Chronological Lifecycle Replay Simulation ---
  // Reset database storage for clean lifecycle run
  mockDbStorage.length = 0;

  const jobId = 99;
  const jobCardNo = "JC099";
  const correlationId = "CORR-LIFECYCLE-99";
  const baseTime = Date.now();

  const publishSimulatedEvent = async (type: string, category: any, source: any, deltaMinutes: number, payload?: any, remarks?: string) => {
    const timestamp = new Date(baseTime + deltaMinutes * 60 * 1000).toISOString();
    const seq = mockDbStorage.filter((e) => e.job_id === jobId).length + 1;
    
    // Simulate direct mock insertion so we can force chronological mock timestamps
    const event: OperationalEvent = {
      event_id: `EV-SIM-${seq}`,
      job_id: jobId,
      job_card_no: jobCardNo,
      timestamp,
      user: "SimUser",
      role: "SimRole",
      workshop_id: 1,
      source,
      event_category: category,
      event_type: type,
      remarks: remarks || null,
      correlation_id: correlationId,
      parent_event_id: null,
      sequence_number: seq,
      source_system: "WMS-Core",
      event_version: "1.0",
      event_status: "PROCESSED",
      payload: payload || null
    };

    // Push directly to mock database list to simulate real storage state at specific timestamps
    mockDbStorage.push({
      ...event,
      transition_time: timestamp // Maps to transition_time column in DB
    });
  };

  // Construct complete workflow lifecycle events with manual/cctv/mobile sources
  await publishSimulatedEvent("VEHICLE_GATE_IN", "CCTV", "CCTV", 0); // T = 0m
  await publishSimulatedEvent("INTAKE_INITIALIZED", "Operational", "MANUAL", 10); // T = 10m
  await publishSimulatedEvent("DIAGNOSTIC_STARTED", "Operational", "MANUAL", 30); // T = 30m
  await publishSimulatedEvent("ESTIMATE_PREPARED", "Operational", "API", 60); // T = 60m (Diag time: 30 mins)
  await publishSimulatedEvent("ESTIMATE_APPROVED", "Operational", "API", 75); // T = 75m
  await publishSimulatedEvent("TECHNICIAN_ASSIGNED", "Operational", "MANUAL", 80, { employee_id: 3, role_type: "Primary Technician" });
  await publishSimulatedEvent("WIP_STARTED", "Operational", "QR", 90); // T = 90m
  await publishSimulatedEvent("QC_SUBMITTED", "Operational", "MOBILE", 180); // T = 180m (WIP Run 1: 90 mins)
  await publishSimulatedEvent("QC_FAILED", "Operational", "MOBILE", 195, null, "Paint smudge on fender"); // T = 195m (fails checklist)
  await publishSimulatedEvent("WIP_STARTED", "Operational", "QR", 210); // T = 210m (Rework Wait: 15 mins)
  await publishSimulatedEvent("QC_SUBMITTED", "Operational", "MOBILE", 240); // T = 240m (WIP Run 2: 30 mins, Total WIP: 120 mins)
  await publishSimulatedEvent("FINAL_REVIEW_STARTED", "Operational", "MOBILE", 245); // T = 245m
  await publishSimulatedEvent("INVOICE_GENERATED", "Integration", "ORACLE_IMPORT", 260, { invoice_no: "IDEVAN2026101010" }); // T = 260m (Billing latency: 15 mins)
  await publishSimulatedEvent("VEHICLE_RELEASED", "CCTV", "CCTV", 270); // T = 270m (Total TAT: 270 mins)

  // 4. Run read-only Replay Simulation
  const events = await repo.findByJobId(jobId);
  assert(events.length === 14, "All 14 chronological events retrieved from Event Store");

  const replayProjection = ReplayEngine.replay(events);
  
  // Replay timeline integrity checks
  assert(replayProjection.workflowStatus === "GATE_OUT", "In-memory replay reconstructs final state: GATE_OUT");
  assert(replayProjection.queue === "DELIVERY_QUEUE", "In-memory replay reconstructs final queue: DELIVERY_QUEUE");
  assert(replayProjection.reworkCount === 1, "In-memory replay reconstructs correct rework loop cycle count");
  assert(replayProjection.technicians.length === 1 && replayProjection.technicians[0].employee_id === 3, "Technician allocations preserved");

  // TAT validation
  const tat = replayProjection.tat;
  assert(tat.totalTatMs === 270 * 60 * 1000, "Total TAT calculation matches expected (270 mins)");
  assert(tat.diagnosticTimeMs === 30 * 60 * 1000, "Diagnostic Time calculation matches expected (30 mins)");
  assert(tat.activeWipMs === 120 * 60 * 1000, "WIP Repair duration sums up both WIP intervals (90m + 30m = 120m)");
  assert(tat.reworkMs === 15 * 60 * 1000, "Rework wait duration calculates correctly (15 mins)");
  assert(tat.billingLatencyMs === 15 * 60 * 1000, "Billing Latency matches expected (15 mins)");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    // Exit explicitly: the harness leaves async handles (timers/mock listeners)
    // open, so without this Node waits on the event loop and the legacy test
    // runner's per-file timeout kills it before it's counted as passed.
    process.exit(0);
  }
}

runTestSuite();
