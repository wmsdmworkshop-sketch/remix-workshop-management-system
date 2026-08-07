import { FsbCampaignManager } from "../core/fsb-goodwill/fsb-campaign-manager";
import { FsbExecutionEngine } from "../core/fsb-goodwill/fsb-execution-engine";
import { FsbEligibilityEngine } from "../core/fsb-goodwill/fsb-eligibility-engine";
import { GoodwillRequestManager } from "../core/fsb-goodwill/goodwill-request-manager";
import { GoodwillEligibilityEngine } from "../core/fsb-goodwill/goodwill-eligibility-engine";
import { CostSharingEngine } from "../core/fsb-goodwill/cost-sharing-engine";
import { EventBus } from "../core/event-bus";
import { pool as db } from "../db/index";

let mockDbState: any = {
  tbl_fsb_campaign: [],
  tbl_fsb_campaign_version: [],
  tbl_fsb_vehicle_eligibility: [],
  tbl_fsb_eligibility_snapshot: [],
  tbl_fsb_execution: [],
  tbl_goodwill_request: [],
};

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  // Campaign Insert
  if (query.includes("INSERT INTO tbl_fsb_campaign (")) {
    mockDbState.tbl_fsb_campaign.push({
      campaign_id: params[0], campaign_name: params[1], campaign_type: params[2],
      priority: params[3], start_date: params[4], status: "ACTIVE"
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_fsb_campaign_version")) {
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_fsb_vehicle_eligibility")) {
    mockDbState.tbl_fsb_vehicle_eligibility.push({
      eligibility_id: params[0], campaign_id: params[1], vin: params[2], eligibility_status: params[3]
    });
    return [[], []];
  }

  // Execution Insert
  if (query.includes("INSERT INTO tbl_fsb_execution (")) {
    mockDbState.tbl_fsb_execution.push({
      execution_id: params[0], campaign_id: params[1], job_id: params[2], vin: params[3],
      technician_id: params[4], attempt_number: params[5], execution_status: "STARTED"
    });
    return [[], []];
  }

  if (query.includes("UPDATE tbl_fsb_execution SET")) {
    const id = params[4];
    const exec = mockDbState.tbl_fsb_execution.find((e: any) => e.execution_id === id);
    if (exec) {
        exec.execution_status = "COMPLETED";
        exec.parts_used = params[1];
        exec.labour_used = params[2];
    }
    return [[], []];
  }

  // Eligibility Selects
  if (query.includes("SELECT * FROM tbl_fsb_campaign WHERE")) {
    return [mockDbState.tbl_fsb_campaign.filter((c: any) => c.campaign_id === params[0]), []];
  }
  
  if (query.includes("SELECT * FROM tbl_fsb_execution WHERE")) {
      if (query.includes("COUNT(*)")) {
        return [[{ attempts: mockDbState.tbl_fsb_execution.filter((e: any) => e.campaign_id === params[0] && e.vin === params[1]).length }], []];
      }
      return [mockDbState.tbl_fsb_execution.filter((e: any) => e.campaign_id === params[0] && e.vin === params[1] && (e.execution_status === 'COMPLETED' || e.execution_status === 'OEM_VERIFIED')), []];
  }

  if (query.includes("SELECT * FROM tbl_fsb_vehicle_eligibility WHERE")) {
    return [mockDbState.tbl_fsb_vehicle_eligibility.filter((e: any) => e.campaign_id === params[0] && e.vin === params[1]), []];
  }

  // Goodwill Insert
  if (query.includes("INSERT INTO tbl_goodwill_request (")) {
    mockDbState.tbl_goodwill_request.push({
      request_id: params[0], vin: params[1], category: params[2], requested_amount: params[3],
      workflow_state: params[10]
    });
    return [[], []];
  }

  if (query.includes("UPDATE tbl_goodwill_request SET")) {
      const id = params[1];
      const req = mockDbState.tbl_goodwill_request.find((r: any) => r.request_id === id);
      if (req) {
        req.workflow_state = params[0];
      }
      return [[], []];
  }

  return [[], []];
}

async function runTests() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE FSB & GOODWILL MANAGEMENT TESTS (SPRINT 9)");
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
  const campaignManager = new FsbCampaignManager(eventBus);
  const executionEngine = new FsbExecutionEngine(eventBus);
  const goodwillManager = new GoodwillRequestManager(eventBus);

  let dispatchedEvents: any[] = [];
  eventBus.subscribe("*", async (envelope) => {
    dispatchedEvents.push(envelope);
  });

  // FSB Tests
  console.log("--- FSB Campaign & Eligibility ---");
  const createRes = await campaignManager.createCampaign("Software Update 2.0", "Software", "HIGH", new Date(), ["VIN-FSB-001"]);
  assert(createRes.success, "Campaign is created with versioning");
  const testCampaignId = createRes.campaignId!;
  
  assert(dispatchedEvents.some(e => e.topic === "FSB_CREATED"), "FSB_CREATED event published");

  const eligRes = await FsbEligibilityEngine.evaluateEligibility(testCampaignId, "VIN-FSB-001");
  assert(eligRes.status === "ELIGIBLE", "Vehicle is eligible for campaign");

  console.log("\n--- FSB Execution & Append-Only History ---");
  dispatchedEvents = [];
  const execRes = await executionEngine.startExecution(testCampaignId, "VIN-FSB-001", 1001, "TECH-01");
  assert(execRes.success, "Execution starts and creates append-only record");
  const testExecutionId = execRes.executionId!;
  assert(dispatchedEvents.some(e => e.topic === "FSB_EXECUTION_STARTED" && e.payload.attemptNumber === 1), "FSB_EXECUTION_STARTED event published with attempt 1");

  await executionEngine.completeExecution(testExecutionId, 100, 200, "Fixed");
  const duplicateExecRes = await executionEngine.startExecution(testCampaignId, "VIN-FSB-001", 1002, "TECH-01");
  assert(!duplicateExecRes.success && duplicateExecRes.error?.includes("COMPLETED"), "Vehicle status prevents duplicate execution");

  // Goodwill Tests
  console.log("\n--- Goodwill Cost Sharing Engine ---");
  const split1 = CostSharingEngine.calculateSplit(1000, 30, undefined, 50, undefined, 20);
  assert(split1.dealer_cost === 300 && split1.oem_cost === 500 && split1.customer_cost === 200, "Cost sharing calculates 50/30/20 correctly");

  const split2 = CostSharingEngine.calculateSplit(1000, 20, undefined, 80, 500, 0);
  assert(split2.dealer_cost === 200 && split2.oem_cost === 500 && split2.customer_cost === 300, "Cost sharing respects monetary limits");

  let threwError = false;
  try {
    CostSharingEngine.calculateSplit(1000, 30, undefined, 50, undefined, 10);
  } catch(e) {
    threwError = true;
  }
  assert(threwError, "Rejects percentages that don't sum to 100");

  console.log("\n--- Goodwill Eligibility Engine ---");
  const rec1 = GoodwillEligibilityEngine.evaluateRequest("VIN123", 6000, "OEM");
  assert(rec1.decision === "MANAGEMENT_REVIEW_REQUIRED" && rec1.recommended_oem_share === 50, "OEM Goodwill over 5000 requires management review");

  console.log("\n--- Goodwill Request Manager & Workflow ---");
  dispatchedEvents = [];
  const gwRes = await goodwillManager.createRequest("VIN-GW-01", "DEALER", 2000, 50, 0, 50, undefined, undefined, "Loyal Customer");
  assert(gwRes.success, "Goodwill request created in DRAFT state");
  const testRequestId = gwRes.requestId!;
  assert(dispatchedEvents.some(e => e.topic === "GOODWILL_REQUESTED"), "GOODWILL_REQUESTED event published");

  dispatchedEvents = [];
  await goodwillManager.updateState(testRequestId, "TECH_REVIEW");
  assert(dispatchedEvents.some(e => e.topic === "GOODWILL_UPDATED" && e.payload.state === "TECH_REVIEW"), "State transition publishes GOODWILL_UPDATED");

  dispatchedEvents = [];
  await goodwillManager.updateState(testRequestId, "OEM_APPROVAL");
  assert(dispatchedEvents.some(e => e.topic === "GOODWILL_APPROVED"), "State transition to OEM_APPROVAL publishes GOODWILL_APPROVED");

  console.log("\n=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
