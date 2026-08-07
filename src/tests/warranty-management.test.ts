// =============================================================================
// WOS Warranty Management Engine Test Suites (Sprint 7)
// Execution: npx tsx src/tests/warranty-management.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { EventBus } from "../core/event-bus";
import { CoverageEngine } from "../core/warranty/coverage-engine";
import { OEMAdapter } from "../core/warranty/oem-adapter";
import { WarrantyClaimManager } from "../core/warranty/warranty-claim-manager";

let mockDbState: any = {
  tbl_warranty_coverage_rules: [
    { rule_id: "R1", operation_type: "Warranty", min_age_months: 0, max_age_months: 36, min_mileage: 0, max_mileage: 100000, is_active: 1 },
    { rule_id: "R2", operation_type: "ExtendedWarranty", min_age_months: 36, max_age_months: 60, min_mileage: 0, max_mileage: 150000, is_active: 1 }
  ],
  tbl_warranty_claims: [],
  tbl_warranty_claim_lines: [],
  tbl_warranty_oem_responses: [],
  tbl_warranty_history: []
};

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.includes("SELECT * FROM tbl_warranty_coverage_rules WHERE operation_type = ? AND is_active = 1")) {
    const rules = mockDbState.tbl_warranty_coverage_rules.filter((r: any) => r.operation_type === params[0]);
    return [rules, []];
  }

  if (query.includes("SELECT claim_id FROM tbl_warranty_claims WHERE job_id = ? AND operation_type = ?")) {
    const existing = mockDbState.tbl_warranty_claims.filter((c: any) => c.job_id === params[0] && c.operation_type === params[1]);
    return [existing, []];
  }

  if (query.includes("INSERT INTO tbl_warranty_claims")) {
    mockDbState.tbl_warranty_claims.push({
      claim_id: params[0], job_id: params[1], vin: params[2], operation_type: params[3],
      workflow_state: params[4], total_claimed_amount: params[5], created_at: params[6]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_warranty_claim_lines")) {
    mockDbState.tbl_warranty_claim_lines.push({
      line_id: params[0], claim_id: params[1], line_type: params[2], item_code: params[3],
      quantity: params[4], unit_price: params[5], claimed_amount: params[6]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_warranty_history")) {
    mockDbState.tbl_warranty_history.push({
      history_id: params[0], claim_id: params[1], action: params[2], details: params[3], timestamp: params[4]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_warranty_oem_responses")) {
    mockDbState.tbl_warranty_oem_responses.push({
      response_id: params[0], claim_id: params[1], status_code: params[2], raw_payload: params[3], received_at: params[4]
    });
    return [[], []];
  }

  if (query.includes("SELECT * FROM tbl_warranty_claims WHERE claim_id = ?")) {
    const claim = mockDbState.tbl_warranty_claims.find((c: any) => c.claim_id === params[0]);
    return [claim ? [claim] : [], []];
  }

  if (query.includes("SELECT * FROM tbl_warranty_claim_lines WHERE claim_id = ?")) {
    const lines = mockDbState.tbl_warranty_claim_lines.filter((c: any) => c.claim_id === params[0]);
    return [lines, []];
  }

  if (query.includes("UPDATE tbl_warranty_claims SET workflow_state")) {
    const claim = mockDbState.tbl_warranty_claims.find((c: any) => c.claim_id === params[2]);
    if (claim) claim.workflow_state = params[0];
    return [[], []];
  }

  if (query.includes("UPDATE tbl_warranty_claims SET oem_claim_reference")) {
    const claim = mockDbState.tbl_warranty_claims.find((c: any) => c.claim_id === params[2]);
    if (claim) {
      claim.oem_claim_reference = params[0];
      claim.total_approved_amount = params[1];
    }
    return [[], []];
  }

  return [[], []];
};

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE WARRANTY MANAGEMENT TESTS (SPRINT 7)");
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
  const oemAdapter = new OEMAdapter();
  const manager = new WarrantyClaimManager(bus, oemAdapter);

  // Subscribe to verify event emissions
  let createdEventFired: boolean = false;
  bus.subscribe("WARRANTY_CLAIM_CREATED", () => { createdEventFired = true; });

  let stateChangeEventFired: boolean = false;
  bus.subscribe("WARRANTY_STATE_CHANGED", () => { stateChangeEventFired = true; });

  console.log("\n--- Coverage Engine Tests ---");
  const cov1 = await CoverageEngine.isVehicleEligible("Warranty", { vin: "VIN123", ageMonths: 12, mileage: 15000 });
  assert(cov1.eligible === true, "Vehicle within age and mileage is eligible for standard Warranty");

  const cov2 = await CoverageEngine.isVehicleEligible("Warranty", { vin: "VIN124", ageMonths: 40, mileage: 15000 });
  assert(cov2.eligible === false, "Vehicle exceeding age limit is ineligible for standard Warranty");

  const partCov1 = await CoverageEngine.isPartEligible("Warranty", "ENGINE_BLOCK");
  assert(partCov1.eligible === true, "Standard part is eligible for Warranty");

  const partCov2 = await CoverageEngine.isPartEligible("Warranty", "WIPER_BLADE");
  assert(partCov2.eligible === false, "Consumable part is ineligible for standard Warranty");

  const partCov3 = await CoverageEngine.isPartEligible("AMC", "WIPER_BLADE");
  assert(partCov3.eligible === true, "Consumable part IS eligible for AMC");

  console.log("\n--- Claim Lifecycle Tests ---");
  const createRes = await manager.createClaim(
    1001, "VIN123", "Warranty", 
    { vin: "VIN123", ageMonths: 12, mileage: 15000 },
    [
      { type: "PARTS", code: "ENGINE_BLOCK", qty: 1, amount: 50000 },
      { type: "LABOUR", code: "ENGINE_R_R", qty: 4, amount: 1200 }
    ]
  );
  assert(createRes.success === true, "Valid warranty claim created successfully");
  assert(Boolean(createdEventFired), "WARRANTY_CLAIM_CREATED event published");
  assert(mockDbState.tbl_warranty_claims.length === 1, "Claim header persisted in DB");
  assert(mockDbState.tbl_warranty_claim_lines.length === 2, "Claim lines persisted in DB");

  const duplicateRes = await manager.createClaim(
    1001, "VIN123", "Warranty", 
    { vin: "VIN123", ageMonths: 12, mileage: 15000 }, []
  );
  assert(duplicateRes.success === false, "Duplicate claims on same job rejected");

  const claimId = createRes.claimId!;

  await manager.progressState(claimId, "OEM_SUBMISSION_READY", "U100", "Approved locally");
  assert(Boolean(stateChangeEventFired), "WARRANTY_STATE_CHANGED event published");
  assert(mockDbState.tbl_warranty_claims[0].workflow_state === "OEM_SUBMISSION_READY", "State updated correctly");

  console.log("\n--- OEM Adapter Tests ---");
  await manager.submitToOEM(claimId, "SYSTEM");
  
  const updatedClaim = mockDbState.tbl_warranty_claims[0];
  assert(updatedClaim.workflow_state === "OEM_APPROVED", "OEM response processed and claim auto-approved");
  assert(updatedClaim.oem_claim_reference !== undefined, "OEM reference ID stored from adapter");
  assert(mockDbState.tbl_warranty_oem_responses.length === 1, "OEM response logged to DB");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
