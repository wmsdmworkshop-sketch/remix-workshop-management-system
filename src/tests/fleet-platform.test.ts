// =============================================================================
// DWIP Fleet Intelligence Platform (FIP) Unit Tests
// Execution: npx tsx src/tests/fleet-platform.test.ts
// =============================================================================

import { pool as db } from "../db/index.ts";
import crypto from "crypto";
import {
  calculateFleetDashboardMetrics,
  calculateVehicleUtilization,
  evaluateFleetRelationshipAndRisk,
  calculateFleetProfitability,
  runPredictiveFleetEngine,
  scanExecutiveOpportunities,
  compileFleetDigitalTwin
} from "../engines/fleet-intelligence-engine.ts";
import { evaluateFleetRules, seedDefaultFleetRules } from "../engines/fleet-rules-evaluator.ts";

const tests: { name: string; fn: () => Promise<void> | void }[] = [];
function test(name: string, fn: () => Promise<void> | void) {
  tests.push({ name, fn });
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}: expected ${expected}, got ${actual}`);
  }
}

// Ensure clean database state before running FIP tests
async function setupFipTestDb() {
  await db.execute("DELETE FROM fleet_opportunities");
  await db.execute("DELETE FROM fleet_breakdowns");
  await db.execute("DELETE FROM fleet_amc_contracts");
  await db.execute("DELETE FROM fleet_passports");
  await db.execute("DELETE FROM customer_passports");
  await db.execute("DELETE FROM job_cards WHERE customer_mobile = '9876543210'");
}

// =============================================================================
// TESTS
// =============================================================================

test("Epic 1 & 8: Fleet Passport 2.0 persists FIP metadata & telematics CONFIG", async () => {
  await setupFipTestDb();

  const customerId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO customer_passports (customer_passport_id, customer_name, contact_phone)
     VALUES (?, ?, ?)`,
    [customerId, "Devanand Fleet Owner", "9876543210"]
  );

  const fleetId = crypto.randomUUID();
  const telematicsConfig = { telematics_enabled: true, device_provider: "Tata Fleet Edge", gps_update_freq_sec: 10 };
  const linkedVehicles = ["MH12XY9011", "MH12XY9012"];

  await db.execute(
    `INSERT INTO fleet_passports (
      fleet_passport_id, fleet_name, fleet_owner_passport_id, operational_region, total_vehicles,
      company, gst, industry, fleet_type, fleet_size, telematics_config, linked_vehicles,
      relationship_health_score, fleet_health_score
     ) VALUES (?, ?, ?, 'North India', 2, 'Logistics Corp', '27AAACL1111A1Z1', 'LOGISTICS', 'TRUCKING', 2, ?, ?, 95.00, 92.50)`,
    [
      fleetId,
      "Devanand Prime Fleet",
      customerId,
      JSON.stringify(telematicsConfig),
      JSON.stringify(linkedVehicles)
    ]
  );

  const [rows] = await db.query("SELECT * FROM fleet_passports WHERE fleet_passport_id = ?", [fleetId]) as any[];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].fleet_name, "Devanand Prime Fleet");
  assertEquals(rows[0].company, "Logistics Corp");
  assertEquals(rows[0].gst, "27AAACL1111A1Z1");
  assertEquals(JSON.parse(rows[0].telematics_config).device_provider, "Tata Fleet Edge");
  assertEquals(JSON.parse(rows[0].linked_vehicles)[1], "MH12XY9012");
});

test("Epic 2 & 7: Fleet Relationship Engine (FRE) & Risk Engine evaluations", async () => {
  await setupFipTestDb();

  const customerId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO customer_passports (customer_passport_id, customer_name, contact_phone)
     VALUES (?, ?, ?)`,
    [customerId, "Devanand Fleet Owner", "9876543210"]
  );

  const fleetId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO fleet_passports (
      fleet_passport_id, fleet_name, fleet_owner_passport_id, total_vehicles, fleet_health_score
     ) VALUES (?, 'Devanand Prime Fleet', ?, 5, 88.00)`,
    [fleetId, customerId]
  );

  const freResult = await evaluateFleetRelationshipAndRisk(fleetId);
  assertEquals(freResult.relationship_score, 93);
  assertEquals(freResult.risk_level, "Healthy"); // default dashboard downtime 35.4h is healthy (< 48h)
  assertEquals(freResult.recommendations.length > 0, true);
});

test("Epic 3: Fleet Profitability Engine calculates gross margin and net contribution", async () => {
  await setupFipTestDb();

  const customerId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO customer_passports (customer_passport_id, customer_name, contact_phone)
     VALUES (?, ?, ?)`,
    [customerId, "Devanand Fleet Owner", "9876543210"]
  );

  const fleetId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO fleet_passports (
      fleet_passport_id, fleet_name, fleet_owner_passport_id, total_vehicles
     ) VALUES (?, 'Devanand Prime Fleet', ?, 5)`,
    [fleetId, customerId]
  );

  const profit = await calculateFleetProfitability(fleetId);
  if (profit) {
    assertEquals(profit.labourRevenue, 50750);
    assertEquals(profit.partsRevenue, 65250);
    assertEquals(profit.lubricantsRevenue, 29000);
    assertEquals(profit.grossMargin, 58362);
    assertEquals(profit.netContribution, 83012);
  }
});

test("Epic 4 & 5: Predictive Engine & Risk classification with explanations", async () => {
  await setupFipTestDb();

  const customerId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO customer_passports (customer_passport_id, customer_name, contact_phone)
     VALUES (?, ?, ?)`,
    [customerId, "Devanand Fleet Owner", "9876543210"]
  );

  const fleetId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO fleet_passports (
      fleet_passport_id, fleet_name, fleet_owner_passport_id, total_vehicles
     ) VALUES (?, 'Devanand Prime Fleet', ?, 5)`,
    [fleetId, customerId]
  );

  const predictions = await runPredictiveFleetEngine(fleetId);
  assertEquals(predictions.length, 2);
  assertEquals(predictions[0].predictedFailure, "Steering Column Play / Wear");
  assertEquals(predictions[0].confidence, 0.94);
  assertEquals(predictions[0].explanation.includes("Repair DNA indicates repeated torque loss"), true);
});

test("Epic 6: Executive Opportunity Engine generates follow-up tasks", async () => {
  await setupFipTestDb();

  const customerId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO customer_passports (customer_passport_id, customer_name, contact_phone)
     VALUES (?, ?, ?)`,
    [customerId, "Devanand Fleet Owner", "9876543210"]
  );

  const fleetId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO fleet_passports (
      fleet_passport_id, fleet_name, fleet_owner_passport_id, total_vehicles, amc_contract_reference, preferred_service_advisor_id
     ) VALUES (?, 'Devanand Prime Fleet', ?, 5, 'AMC-REF-99', 1)`,
    [fleetId, customerId]
  );

  const opps = await scanExecutiveOpportunities(fleetId);
  assertEquals(opps.length, 3);
  assertEquals(opps[0].type, "AMC_RENEWAL");
  
  // Verify inserted rows in fleet_opportunities
  const [dbOpps] = await db.query("SELECT * FROM fleet_opportunities WHERE fleet_passport_id = ?", [fleetId]) as any[];
  assertEquals(dbOpps.length, 3);
  assertEquals(dbOpps.some(o => o.opportunity_type === "AMC_RENEWAL"), true);
});

test("Epic 10: Fleet Digital Twin aggregates connected operational models", async () => {
  await setupFipTestDb();

  const customerId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO customer_passports (customer_passport_id, customer_name, contact_phone)
     VALUES (?, ?, ?)`,
    [customerId, "Devanand Fleet Owner", "9876543210"]
  );

  const fleetId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO fleet_passports (
      fleet_passport_id, fleet_name, fleet_owner_passport_id, total_vehicles
     ) VALUES (?, 'Devanand Prime Fleet', ?, 5)`,
    [fleetId, customerId]
  );

  const twin = await compileFleetDigitalTwin(fleetId);
  assertEquals(twin.digitalTwinId.startsWith("TWIN-FL-"), true);
  assertEquals(twin.liveStatus.fleetHealthScore, 100.00);
});

test("Rules Engine: evaluateFleetRules evaluates thresholds correctly", async () => {
  await seedDefaultFleetRules();
  const metrics = {
    fleet_health_score: 82.5, // should trigger alert (< 85)
    average_downtime_hours: 55.2, // should trigger alert (> 48)
    cost_per_km: 22.0
  };

  const alerts = await evaluateFleetRules(metrics);
  assertEquals(alerts.length, 2);
  assertEquals(alerts.some(a => a.alert_type === "HEALTH_ALERT"), true);
  assertEquals(alerts.some(a => a.alert_type === "DOWNTIME_ALERT"), true);
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING FLEET INTELLIGENCE PLATFORM (FIP) UNIT TESTS");
  console.log("=============================================================================");

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`[PASS] ${t.name}`);
      passed++;
    } catch (err: any) {
      console.log(`[FAIL] ${t.name}`);
      console.error(err.stack || err.message);
      failed++;
    }
  }

  // Cleanup test data
  try {
    await db.execute("DELETE FROM fleet_opportunities");
    await db.execute("DELETE FROM fleet_breakdowns");
    await db.execute("DELETE FROM fleet_amc_contracts");
    await db.execute("DELETE FROM fleet_passports");
    await db.execute("DELETE FROM customer_passports");
  } catch (e) {}

  console.log("=============================================================================");
  console.log(`FIP UNIT TESTS RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  try {
    await db.end();
  } catch (e) {}

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(async (err) => {
  console.error(err);
  try {
    await db.end();
  } catch (e) {}
  process.exit(1);
});
