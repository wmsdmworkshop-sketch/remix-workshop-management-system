import { AppointmentManager, GateEntryManager } from "../core/workshop/gate-entry-manager";
import { JobCardEngine } from "../core/workshop/job-card-engine";
import { EstimateManager } from "../core/workshop/estimate-manager";
import { BayAllocationEngine, TechnicianAssignmentEngine } from "../core/workshop/allocation-engines";
import { EventBus } from "../core/event-bus";
import { pool as db } from "../db/index";

let mockDbState: any = {
  tbl_gate_entry: [],
  tbl_workshop_appointment: [],
  tbl_job_card: [],
  tbl_job_card_revision: [],
  tbl_workshop_estimate: [],
  tbl_workshop_estimate_revision: [],
  tbl_job_operation: [],
  tbl_bay_master: [
    { bay_id: "BAY-GEN-01", bay_type: "GENERAL", status: "AVAILABLE" }
  ],
  tbl_bay_allocation: [],
  tbl_workshop_timeline: []
};

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.includes("INSERT INTO tbl_gate_entry (")) {
    mockDbState.tbl_gate_entry.push({ gate_entry_id: params[0] });
    return [[], []];
  }
  
  if (query.includes("INSERT INTO tbl_workshop_appointment (")) {
    mockDbState.tbl_workshop_appointment.push({ appointment_id: params[0] });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_job_card (")) {
    mockDbState.tbl_job_card.push({ job_card_id: params[0], operational_state: params[6] });
    return [[], []];
  }

  if (query.includes("UPDATE tbl_job_card SET operational_state = ? WHERE job_card_id = ?")) {
    const jc = mockDbState.tbl_job_card.find((j: any) => j.job_card_id === params[1]);
    if (jc) jc.operational_state = params[0];
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_job_card_revision (")) {
    mockDbState.tbl_job_card_revision.push({ revision_id: params[0], job_card_id: params[1], version: params[2] });
    return [[], []];
  }

  if (query.includes("SELECT MAX(version) as max_v FROM tbl_job_card_revision")) {
    const revs = mockDbState.tbl_job_card_revision.filter((r: any) => r.job_card_id === params[0]);
    const max_v = revs.length > 0 ? Math.max(...revs.map((r: any) => r.version)) : 0;
    return [[{ max_v }], []];
  }

  if (query.includes("INSERT INTO tbl_workshop_estimate (")) {
    mockDbState.tbl_workshop_estimate.push({ estimate_id: params[0], job_card_id: params[1], current_version: params[5], total_labour: params[2], total_parts: params[3] });
    return [[], []];
  }

  if (query.includes("SELECT current_version, job_card_id FROM tbl_workshop_estimate WHERE estimate_id = ?")) {
    const est = mockDbState.tbl_workshop_estimate.find((e: any) => e.estimate_id === params[0]);
    return [est ? [est] : [], []];
  }

  if (query.includes("INSERT INTO tbl_workshop_estimate_revision (")) {
    mockDbState.tbl_workshop_estimate_revision.push({ revision_id: params[0], version: params[2] });
    return [[], []];
  }

  if (query.includes("UPDATE tbl_workshop_estimate SET current_version = ?")) {
    const est = mockDbState.tbl_workshop_estimate.find((e: any) => e.estimate_id === params[3]);
    if (est) {
      est.current_version = params[0];
      est.total_labour = params[1];
      est.total_parts = params[2];
    }
    return [[], []];
  }

  if (query.includes("SELECT bay_id FROM tbl_bay_master WHERE bay_type = ? AND status = 'AVAILABLE' LIMIT 1")) {
    const bay = mockDbState.tbl_bay_master.find((b: any) => b.bay_type === params[0] && b.status === "AVAILABLE");
    return [bay ? [bay] : [], []];
  }

  if (query.includes("INSERT INTO tbl_bay_allocation (")) {
    mockDbState.tbl_bay_allocation.push({ allocation_id: params[0] });
    return [[], []];
  }

  if (query.includes("UPDATE tbl_bay_master SET status = 'OCCUPIED' WHERE bay_id = ?")) {
    const bay = mockDbState.tbl_bay_master.find((b: any) => b.bay_id === params[0]);
    if (bay) bay.status = "OCCUPIED";
    return [[], []];
  }

  if (query.includes("UPDATE tbl_job_operation SET technician_id = ?, status = 'ASSIGNED' WHERE operation_id = ?")) {
    mockDbState.tbl_job_operation.push({ operation_id: params[1], technician_id: params[0], status: "ASSIGNED" });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_workshop_timeline (")) {
    mockDbState.tbl_workshop_timeline.push({ reference_id: params[1], event_type: params[2] });
    return [[], []];
  }

  return [[], []];
};

async function runTests() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE WORKSHOP OPERATIONS TESTS (SPRINT 11)");
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
  const appointmentManager = new AppointmentManager(eventBus);
  const gateEntryManager = new GateEntryManager(eventBus);
  const jobCardEngine = new JobCardEngine(eventBus);
  const estimateManager = new EstimateManager(eventBus);
  const bayEngine = new BayAllocationEngine(eventBus);
  const techEngine = new TechnicianAssignmentEngine(eventBus);

  let dispatchedEvents: any[] = [];
  eventBus.subscribe("*", async (envelope) => {
    dispatchedEvents.push(envelope);
  });

  console.log("--- Arrival & Gate Entry ---");
  const appRes = await appointmentManager.createAppointment("VIN-WS-123", "CUST-001", "GENERAL_REPAIR", new Date());
  assert(appRes.success, "Appointment created successfully");
  assert(dispatchedEvents.some(e => e.topic === "APPOINTMENT_CREATED"), "APPOINTMENT_CREATED event published");

  dispatchedEvents = [];
  const geRes = await gateEntryManager.createGateEntry("VIN-WS-123", "WALK_IN", 45000, appRes.appointmentId);
  assert(geRes.success, "Gate entry created with appointment reference");
  assert(dispatchedEvents.some(e => e.topic === "GATE_ENTRY_CREATED"), "GATE_ENTRY_CREATED event published");
  assert(mockDbState.tbl_workshop_timeline.some((t: any) => t.event_type === "GATE_ENTRY_CREATED"), "Gate Entry added to Unified Timeline");

  console.log("\n--- Job Card Creation & State Engine ---");
  dispatchedEvents = [];
  const jcRes = await jobCardEngine.createJobCard("VIN-WS-123", "GENERAL_REPAIR", geRes.gateEntryId);
  assert(jcRes.success, "Job Card created successfully");
  const testJobCardId = jcRes.jobCardId!;
  assert(dispatchedEvents.some(e => e.topic === "JOB_CARD_CREATED"), "JOB_CARD_CREATED event published");
  
  await jobCardEngine.updateOperationalState(testJobCardId, "IN_BAY", "SYS-01");
  assert(mockDbState.tbl_job_card.find((j: any) => j.job_card_id === testJobCardId).operational_state === "IN_BAY", "Operational state correctly updated to IN_BAY independent of workflow");
  assert(mockDbState.tbl_workshop_timeline.some((t: any) => t.event_type === "OPERATIONAL_STATE_CHANGED"), "Operational state change logged to Unified Timeline");

  await jobCardEngine.reviseJobCard(testJobCardId, "Added brake inspection", "SA-01");
  assert(mockDbState.tbl_job_card_revision.some((r: any) => r.job_card_id === testJobCardId && r.version === 1), "Job Card Revision v1 created successfully");

  console.log("\n--- Estimate Revisions ---");
  dispatchedEvents = [];
  const estRes = await estimateManager.createEstimate(testJobCardId, 5000, 2000);
  assert(estRes.success, "Estimate created successfully");
  const testEstId = estRes.estimateId!;
  
  await estimateManager.reviseEstimate(testEstId, 5000, 4000, "Customer requested synthetic oil instead");
  const updatedEst = mockDbState.tbl_workshop_estimate.find((e: any) => e.estimate_id === testEstId);
  assert(updatedEst.current_version === 2 && updatedEst.total_parts === 4000, "Estimate version increments and amounts update correctly");
  assert(mockDbState.tbl_workshop_estimate_revision.length === 1, "Estimate revision trace saved");
  assert(dispatchedEvents.some(e => e.topic === "ESTIMATE_REVISED" && e.payload.version === 2), "ESTIMATE_REVISED event published with new version");

  console.log("\n--- Workshop Allocation Engines ---");
  dispatchedEvents = [];
  const bayRes = await bayEngine.allocateBay(testJobCardId, "GENERAL");
  assert(bayRes.success, "Bay allocated successfully");
  assert(mockDbState.tbl_bay_master.find((b: any) => b.bay_id === bayRes.bayId).status === "OCCUPIED", "Bay marked as occupied");
  assert(dispatchedEvents.some(e => e.topic === "BAY_ALLOCATED"), "BAY_ALLOCATED event published");

  dispatchedEvents = [];
  const techRes = await techEngine.assignTechnician("OP-001", testJobCardId, "HV");
  assert(techRes.success, "Technician assigned successfully to operation");
  assert(techRes.technicianId === "TECH-HV-1", "Technician assigned based on required skill");
  assert(dispatchedEvents.some(e => e.topic === "TECHNICIAN_ASSIGNED"), "TECHNICIAN_ASSIGNED event published");
  assert(mockDbState.tbl_workshop_timeline.some((t: any) => t.event_type === "TECHNICIAN_ASSIGNED"), "Technician Assignment added to Unified Timeline");

  console.log("\n=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
