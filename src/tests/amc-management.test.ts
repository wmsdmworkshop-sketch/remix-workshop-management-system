// =============================================================================
// WOS AMC Management Engine Test Suites (Sprint 8)
// Execution: npx tsx src/tests/amc-management.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { EventBus } from "../core/event-bus";
import { AmcCoverageEngine } from "../core/amc/amc-coverage-engine";
import { AmcContractManager } from "../core/amc/amc-contract-manager";
import { AmcConsumptionEngine } from "../core/amc/amc-consumption-engine";
import { AmcEventManager } from "../core/amc/amc-event-manager";

let mockDbState: any = {
  tbl_amc_product: [
    { product_id: "PROD-SILVER", product_name: "Silver AMC", base_price: 15000, duration_months: 12, km_limit: 20000, service_count_limit: 2, is_active: 1 },
    { product_id: "PROD-FLEET", product_name: "Fleet AMC", base_price: 100000, duration_months: 24, km_limit: 100000, service_count_limit: 10, is_active: 1 }
  ],
  tbl_amc_coverage: [
    { coverage_id: "COV1", product_id: "PROD-SILVER", item_type: "LABOUR", item_code: null, coverage_percentage: 100, is_active: 1 },
    { coverage_id: "COV2", product_id: "PROD-SILVER", item_type: "PARTS", item_code: null, coverage_percentage: 100, is_active: 1 },
    { coverage_id: "COV3", product_id: "PROD-SILVER", item_type: "SPECIFIC_PART", item_code: "ENGINE_OIL", coverage_percentage: 100, is_active: 1 },
    { coverage_id: "COV4", product_id: "PROD-SILVER", item_type: "SPECIFIC_PART", item_code: "BRAKE_PAD", coverage_percentage: 45, is_active: 1 }, // Partial
    { coverage_id: "COV5", product_id: "PROD-SILVER", item_type: "SPECIFIC_PART", item_code: "WIPER_BLADE", coverage_percentage: 0, is_active: 1 }  // Excluded
  ],
  tbl_amc_contract: [],
  tbl_amc_contract_vehicles: [],
  tbl_amc_consumption_ledger: [],
  tbl_amc_history: []
};

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.includes("SELECT * FROM tbl_amc_product WHERE product_id = ?")) {
    const product = mockDbState.tbl_amc_product.find((p: any) => p.product_id === params[0]);
    return [product ? [product] : [], []];
  }

  if (query.includes("SELECT * FROM tbl_amc_coverage WHERE product_id = ? AND item_type = 'SPECIFIC_PART' AND item_code = ?")) {
    const rules = mockDbState.tbl_amc_coverage.filter((r: any) => r.product_id === params[0] && r.item_type === "SPECIFIC_PART" && r.item_code === params[1]);
    return [rules, []];
  }

  if (query.includes("SELECT * FROM tbl_amc_coverage WHERE product_id = ? AND item_type = ? AND item_code IS NULL")) {
    const rules = mockDbState.tbl_amc_coverage.filter((r: any) => r.product_id === params[0] && r.item_type === params[1]);
    return [rules, []];
  }

  if (query.includes("INSERT INTO tbl_amc_contract (")) {
    mockDbState.tbl_amc_contract.push({
      contract_id: params[0], product_id: params[1], customer_id: params[2], contract_type: params[3],
      start_date: params[4], expiry_date: params[5], workflow_state: params[6], payment_status: params[7], total_value: params[8]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_amc_contract_vehicles")) {
    mockDbState.tbl_amc_contract_vehicles.push({
      mapping_id: params[0], contract_id: params[1], vin: params[2], is_active: 1
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_amc_consumption_ledger")) {
    mockDbState.tbl_amc_consumption_ledger.push({
      ledger_id: params[0], contract_id: params[1], vin: params[2], job_id: params[3],
      transaction_type: params[4], amount: params[5], service_count: params[6], km_reading: params[7], details: params[8]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_amc_history")) {
    mockDbState.tbl_amc_history.push({
      history_id: params[0], contract_id: params[1], action: params[2], details: params[3], timestamp: params[4]
    });
    return [[], []];
  }

  if (query.includes("SELECT c.*, p.km_limit, p.service_count_limit FROM tbl_amc_contract c JOIN tbl_amc_product p")) {
    const contract = mockDbState.tbl_amc_contract.find((c: any) => c.contract_id === params[0]);
    if (contract) {
      const product = mockDbState.tbl_amc_product.find((p: any) => p.product_id === contract.product_id);
      return [[{ ...contract, km_limit: product.km_limit, service_count_limit: product.service_count_limit }], []];
    }
    return [[], []];
  }

  if (query.includes("SELECT * FROM tbl_amc_contract_vehicles WHERE contract_id = ? AND vin = ? AND is_active = 1")) {
    const vehicles = mockDbState.tbl_amc_contract_vehicles.filter((v: any) => v.contract_id === params[0] && v.vin === params[1] && v.is_active === 1);
    return [vehicles, []];
  }

  if (query.includes("SUM(CASE WHEN transaction_type = 'DEBIT_SERVICE' THEN service_count ELSE 0 END) as total_services")) {
    const ledgers = mockDbState.tbl_amc_consumption_ledger.filter((l: any) => l.contract_id === params[0]);
    const total_services = ledgers.filter((l: any) => l.transaction_type === 'DEBIT_SERVICE').reduce((sum: number, l: any) => sum + (l.service_count || 0), 0);
    const max_km = ledgers.reduce((max: number, l: any) => Math.max(max, l.km_reading || 0), 0);
    return [[{ total_services, max_km }], []];
  }

  if (query.includes("UPDATE tbl_amc_contract SET workflow_state")) {
    const contract = mockDbState.tbl_amc_contract.find((c: any) => c.contract_id === params[2]);
    if (contract) contract.workflow_state = params[0];
    return [[], []];
  }

  return [[], []];
};

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE AMC MANAGEMENT TESTS (SPRINT 8)");
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
  const contractManager = new AmcContractManager(bus);
  const consumptionEngine = new AmcConsumptionEngine(bus);
  const eventManager = new AmcEventManager(bus);

  let createdEventFired: boolean = false;
  bus.subscribe("AMC_CREATED", () => { createdEventFired = true; });
  let warningEventFired: boolean = false;
  bus.subscribe("AMC_LIMIT_WARNING", () => { warningEventFired = true; });
  let reminderEventFired: boolean = false;
  bus.subscribe("AMC_RENEWAL_REMINDER_SCHEDULED", () => { reminderEventFired = true; });

  console.log("\n--- Coverage Engine Tests (Graded Decisions) ---");
  const cov1 = await AmcCoverageEngine.evaluateItemCoverage("PROD-SILVER", "LABOUR");
  assert(cov1.decision === "FULL_COVERAGE" && cov1.percentage_covered === 100, "Generic LABOUR is fully covered");

  const cov2 = await AmcCoverageEngine.evaluateItemCoverage("PROD-SILVER", "SPECIFIC_PART", "BRAKE_PAD");
  assert(cov2.decision === "APPROVAL_REQUIRED" && cov2.percentage_covered === 45, "Partial coverage <50% requires approval");

  const cov3 = await AmcCoverageEngine.evaluateItemCoverage("PROD-SILVER", "SPECIFIC_PART", "WIPER_BLADE");
  assert(cov3.decision === "REJECTED" && cov3.percentage_covered === 0, "Explicitly excluded part is rejected");

  console.log("\n--- Fleet Contract Manager Tests ---");
  const fleetRes = await contractManager.createContract("PROD-FLEET", "CUST-999", ["VIN1", "VIN2", "VIN3"]);
  assert(fleetRes.success === true, "Fleet contract created successfully");
  assert(Boolean(createdEventFired), "AMC_CREATED event published");
  assert(mockDbState.tbl_amc_contract[0].contract_type === "Fleet", "Contract marked as Fleet");
  assert(mockDbState.tbl_amc_contract_vehicles.length === 3, "All fleet VINs mapped");

  console.log("\n--- Consumption Ledger Tests ---");
  const contractId = fleetRes.contractId!;
  
  // Must activate first
  await contractManager.progressState(contractId, "ACTIVE", "SYSTEM");

  const cons1 = await consumptionEngine.consumeService(contractId, "VIN1", 5001, 10000, 15000);
  assert(cons1.success === true, "Valid consumption logged to ledger");
  assert(mockDbState.tbl_amc_consumption_ledger.length === 1, "Ledger entry created");

  const cons2 = await consumptionEngine.consumeService(contractId, "VIN99", 5002, 10000, 15000);
  assert(cons2.success === false && cons2.errors![0].includes("not covered"), "Invalid VIN consumption rejected");

  // Push to warning limit (Fleet limit is 10 services. Consume 8 more to hit 9 (90%))
  for (let i=0; i<8; i++) {
    await consumptionEngine.consumeService(contractId, "VIN2", 5003+i, 11000+i, 100);
  }
  assert(Boolean(warningEventFired), "AMC_LIMIT_WARNING event published at 90% utilization");

  console.log("\n--- Event Manager Tests ---");
  await eventManager.scheduleRenewalReminder(contractId, 30);
  assert(Boolean(reminderEventFired), "Configurable renewal reminder event dispatched");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
