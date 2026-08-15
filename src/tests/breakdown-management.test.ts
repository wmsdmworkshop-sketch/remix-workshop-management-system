import { BreakdownManager } from "../core/breakdown/breakdown-manager";
import { DispatchEngine } from "../core/breakdown/dispatch-engine";
import { ResourceEngine } from "../core/breakdown/resource-engine";
import { TrackingEngine } from "../core/breakdown/tracking-engine";
import { TowManagementEngine } from "../core/breakdown/tow-engine";
import { EventBus } from "../core/event-bus";
import { pool as db } from "../db/index";

let mockDbState: any = {
  tbl_breakdown_case: [],
  tbl_breakdown_activity: [],
  tbl_breakdown_dispatch: [],
  tbl_breakdown_dispatch_history: [],
  tbl_breakdown_tracking: [],
  tbl_breakdown_geo_snapshot: [],
  tbl_breakdown_tow: []
};

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.includes("INSERT INTO tbl_breakdown_case (")) {
    mockDbState.tbl_breakdown_case.push({ case_id: params[0], workflow_state: params[8] });
    return [[], []];
  }

  if (query.includes("UPDATE tbl_breakdown_case SET workflow_state = ? WHERE case_id = ?")) {
    const caseObj = mockDbState.tbl_breakdown_case.find((c: any) => c.case_id === params[1]);
    if (caseObj) caseObj.workflow_state = params[0];
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_breakdown_activity (")) {
    mockDbState.tbl_breakdown_activity.push({ activity_id: params[0], case_id: params[1], activity_type: params[2] });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_breakdown_dispatch (")) {
    mockDbState.tbl_breakdown_dispatch.push({ dispatch_id: params[0], case_id: params[1], technician_id: params[4], dispatch_status: params[6] });
    return [[], []];
  }

  if (query.includes("UPDATE tbl_breakdown_dispatch SET dispatch_status = ? WHERE dispatch_id = ?")) {
    const d = mockDbState.tbl_breakdown_dispatch.find((x: any) => x.dispatch_id === params[1]);
    if (d) d.dispatch_status = params[0];
    return [[], []];
  }
  
  if (query.includes("UPDATE tbl_breakdown_dispatch SET technician_id = ?, dispatch_status = 'REASSIGNED' WHERE dispatch_id = ?")) {
    const d = mockDbState.tbl_breakdown_dispatch.find((x: any) => x.dispatch_id === params[1]);
    if (d) d.technician_id = params[0];
    if (d) d.dispatch_status = 'REASSIGNED';
    return [[], []];
  }

  if (query.includes("SELECT technician_id FROM tbl_breakdown_dispatch WHERE dispatch_id = ?")) {
    const d = mockDbState.tbl_breakdown_dispatch.find((x: any) => x.dispatch_id === params[0]);
    return [[{ technician_id: d?.technician_id }], []];
  }

  if (query.includes("INSERT INTO tbl_breakdown_dispatch_history (")) {
    mockDbState.tbl_breakdown_dispatch_history.push({ history_id: params[0], dispatch_id: params[1], previous_technician_id: params[2], new_technician_id: params[3] });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_breakdown_tracking (")) {
    mockDbState.tbl_breakdown_tracking.push({ tracking_id: params[0], dispatch_id: params[1] });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_breakdown_geo_snapshot (")) {
    mockDbState.tbl_breakdown_geo_snapshot.push({ snapshot_id: params[0], case_id: params[1], event_type: params[2] });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_breakdown_tow (")) {
    mockDbState.tbl_breakdown_tow.push({ tow_id: params[0], case_id: params[1], status: params[5] });
    return [[], []];
  }

  if (query.includes("SELECT case_id FROM tbl_breakdown_tow WHERE tow_id = ?")) {
      const t = mockDbState.tbl_breakdown_tow.find((x:any) => x.tow_id === params[0]);
      return [[{case_id: t?.case_id}], []];
  }

  if (query.includes("UPDATE tbl_breakdown_tow SET status = 'COMPLETED'")) {
    const t = mockDbState.tbl_breakdown_tow.find((x: any) => x.tow_id === params[1]);
    if (t) t.status = 'COMPLETED';
    return [[], []];
  }

  return [[], []];
};

async function runTests() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE BREAKDOWN & QRT MANAGEMENT TESTS (SPRINT 10)");
  console.log("=============================================================================\n");

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

  const eventBus = new EventBus();
  const breakdownManager = new BreakdownManager(eventBus);
  const dispatchEngine = new DispatchEngine(eventBus);
  const towEngine = new TowManagementEngine(eventBus);

  let dispatchedEvents: any[] = [];
  eventBus.subscribe("*", async (envelope) => {
    dispatchedEvents.push(envelope);
  });

  console.log("--- Case Creation & State ---");
  const caseRes = await breakdownManager.createCase(
    "VIN-BD-001",
    "TATA_HELPLINE",
    { latitude: 19.0760, longitude: 72.8777 },
    "Engine overheated and stalled",
    "CRITICAL",
    "CRITICAL"
  );
  assert(caseRes.success, "Breakdown case successfully created");
  const testCaseId = caseRes.caseId!;
  assert(dispatchedEvents.some(e => e.topic === "BREAKDOWN_REPORTED"), "BREAKDOWN_REPORTED event published");

  await breakdownManager.updateState(testCaseId, "VALIDATED");
  assert(mockDbState.tbl_breakdown_case.find((c: any) => c.case_id === testCaseId).workflow_state === "VALIDATED", "Workflow state updated to VALIDATED");
  assert(mockDbState.tbl_breakdown_activity.some((a: any) => a.case_id === testCaseId && a.activity_type === "STATE_CHANGE"), "Activity logged for state change");

  console.log("\n--- Resource & Dispatch Engine ---");
  const resource = ResourceEngine.evaluateBestResource({
    case_id: testCaseId,
    location: { latitude: 19.0760, longitude: 72.8777 },
    required_skills: ["HIGH_VOLTAGE"],
    is_mobile_van_required: true
  });
  
  assert(resource.technician_id === "TECH-HV-99", "Resource engine assigns specialized technician for High Voltage");
  assert(resource.mobile_van_id === "VAN-007", "Resource engine assigns mobile van as requested");

  dispatchedEvents = [];
  const dispatchRes = await dispatchEngine.createDispatch(testCaseId, resource);
  assert(dispatchRes.success, "Dispatch record created");
  const testDispatchId = dispatchRes.dispatchId!;
  assert(dispatchedEvents.some(e => e.topic === "BREAKDOWN_ASSIGNED"), "BREAKDOWN_ASSIGNED event published");

  console.log("\n--- Dispatch Reassignment History ---");
  dispatchedEvents = [];
  await dispatchEngine.reassignTechnician(testDispatchId, "TECH-NEW-02", "Previous tech van broke down");
  const dHist = mockDbState.tbl_breakdown_dispatch_history.find((h: any) => h.dispatch_id === testDispatchId);
  assert(dHist !== undefined, "Dispatch history record created for reassignment");
  assert(dHist.previous_technician_id === "TECH-HV-99" && dHist.new_technician_id === "TECH-NEW-02", "Dispatch history tracks old and new technician");
  assert(dispatchedEvents.some(e => e.topic === "BREAKDOWN_REASSIGNED"), "BREAKDOWN_REASSIGNED event published");

  console.log("\n--- Tracking & Geo Snapshots ---");
  await TrackingEngine.logTracking(testDispatchId, { latitude: 19.0800, longitude: 72.8800 }, 40, 5, 10);
  assert(mockDbState.tbl_breakdown_tracking.length === 1, "Telemetry log appended to tracking table");

  await TrackingEngine.createGeoSnapshot(testCaseId, "TECHNICIAN_ARRIVED", { latitude: 19.0760, longitude: 72.8777 });
  assert(mockDbState.tbl_breakdown_geo_snapshot.length === 1, "Geo snapshot created for major event");

  console.log("\n--- Tow Management Engine ---");
  dispatchedEvents = [];
  const towRes = await towEngine.requestTow({
    case_id: testCaseId,
    destination_workshop_id: "WS-MAIN-01",
    distance_km: 15,
    tow_charges: 1500
  });
  assert(towRes.success, "Tow request created successfully");
  const testTowId = towRes.towId!;
  assert(dispatchedEvents.some(e => e.topic === "TOW_REQUESTED"), "TOW_REQUESTED event published");

  dispatchedEvents = [];
  await towEngine.completeTow(testTowId);
  assert(mockDbState.tbl_breakdown_tow.find((t: any) => t.tow_id === testTowId).status === "COMPLETED", "Tow marked as COMPLETED");
  assert(dispatchedEvents.some(e => e.topic === "WORKSHOP_REACHED"), "WORKSHOP_REACHED event published upon tow completion");

  console.log("\n=============================================================================");
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

runTests().catch(console.error);
