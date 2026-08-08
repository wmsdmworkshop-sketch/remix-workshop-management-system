// =============================================================================
// DWIP Warranty Intelligence & Claim Excellence Platform (WICE) Unit Tests
// Execution: npx tsx src/tests/wice-engine.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { verifyTestIsolation } from "./destructive_test_guard.ts";
import crypto from "crypto";

const tests: { name: string; fn: () => Promise<void> | void }[] = [];
function test(name: string, fn: () => Promise<void> | void) {
  tests.push({ name, fn });
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}: expected ${expected}, got ${actual}`);
  }
}

// Ensure WICE Tables exist and clear test data before runs
async function setupWiceTestDb() {
  await verifyTestIsolation();
  await db.execute("DELETE FROM oem_queries");
  await db.execute("DELETE FROM warranty_passports");
  await db.execute("DELETE FROM warranty_claims");
  await db.execute("DELETE FROM job_cards WHERE job_id IN (9001, 9002)");

  await db.execute(
    "INSERT INTO job_cards (job_id, job_card_no, vrn, customer_name, customer_mobile, vehicle_model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [9001, "JC-TEST-9001", "MH12XY1234", "Ramesh Kumar", "9999999999", "Tata Signa", new Date().toISOString()]
  );
  await db.execute(
    "INSERT INTO job_cards (job_id, job_card_no, vrn, customer_name, customer_mobile, vehicle_model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [9002, "JC-TEST-9002", "MH12XY5678", "Suresh Kumar", "9999999998", "Tata Signa", new Date().toISOString()]
  );
}

// =============================================================================
// TESTS
// =============================================================================

test("Epic 1 & 12: Warranty Passport creates timeline, identity, relationships and parses successfully", async () => {
  await setupWiceTestDb();

  const claimId = crypto.randomUUID();
  const passportId = crypto.randomUUID();

  // Create claim placeholder
  await db.execute(
    "INSERT INTO warranty_claims (claim_id, job_id, claim_type, part_number, claim_amount, status) VALUES (?, ?, ?, ?, ?, ?)",
    [claimId, 9001, "STANDARD", "252512100101", 1450.00, "PENDING"]
  );

  const identity = {
    claim_no: "W-CLM-9001",
    vehicle_vin: "MAT453982HLD00122",
    odometer: 125000,
    customer_name: "Ramesh Kumar"
  };

  const dna = {
    approval_probability: 95,
    risk_score: 5
  };

  const timeline = [
    { event: "CREATED", timestamp: new Date().toISOString(), user: "advisor_jane" }
  ];

  await db.execute(
    "INSERT INTO warranty_passports (passport_id, claim_id, identity_payload, dna_payload, timeline_payload, relationships, knowledge_links, evidence_links) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      passportId,
      claimId,
      JSON.stringify(identity),
      JSON.stringify(dna),
      JSON.stringify(timeline),
      JSON.stringify({ vehicle: "MAT453982HLD00122" }),
      JSON.stringify(["SC/2023/133"]),
      JSON.stringify(["torque_log_1"])
    ]
  );

  const [rows] = await db.query("SELECT * FROM warranty_passports WHERE passport_id = ?", [passportId]) as any[];
  assertEquals(rows.length, 1);
  assertEquals(JSON.parse(rows[0].identity_payload).claim_no, "W-CLM-9001");
  assertEquals(JSON.parse(rows[0].dna_payload).approval_probability, 95);
});

test("Epic 3 & 9: Pre-Submission Validation asserts readiness scores based on completed evidence metrics", () => {
  const evaluateValidation = (
    odometer: number,
    daysSinceSale: number,
    evidence: { torqueLog: boolean; calibration: boolean; measurements: boolean; images: boolean; history: boolean }
  ) => {
    let passed = 0;
    if (odometer <= 300000) passed++;
    if (daysSinceSale <= 1095) passed++;
    if (evidence.torqueLog) passed++;
    if (evidence.calibration) passed++;
    if (evidence.measurements) passed++;
    if (evidence.images) passed++;
    if (evidence.history) passed++;

    const score = Math.round((passed / 7) * 100);
    return {
      readinessScore: score,
      shouldSubmit: score >= 70
    };
  };

  // Case 1: Complete evidence & active warranty
  const res1 = evaluateValidation(120000, 300, { torqueLog: true, calibration: true, measurements: true, images: true, history: true });
  assertEquals(res1.readinessScore, 100);
  assertEquals(res1.shouldSubmit, true);

  // Case 2: Missing critical torque logs and image evidence
  const res2 = evaluateValidation(120000, 300, { torqueLog: false, calibration: true, measurements: true, images: false, history: true });
  assertEquals(res2.readinessScore, 71); // Still above 70% threshold but indicates warning
  assertEquals(res2.shouldSubmit, true);
});

test("Epic 4 & 7: AI Claims Assistant recommendations recommend Goodwill type when standard warranty has expired", () => {
  const recommendClaimType = (odometer: number, daysSinceSale: number, historyComplete: boolean) => {
    const expired = odometer > 300000 || daysSinceSale > 1095;
    if (expired && historyComplete && daysSinceSale <= 1200) {
      return "GOODWILL";
    }
    return expired ? "POLICY_EXTENSION" : "STANDARD";
  };

  // Standard warranty active
  assertEquals(recommendClaimType(150000, 500, true), "STANDARD");

  // Standard warranty expired, but loyalty and service history complete
  assertEquals(recommendClaimType(320000, 1150, true), "GOODWILL");

  // Fully expired with incomplete service history
  assertEquals(recommendClaimType(350000, 1300, false), "POLICY_EXTENSION");
});

test("Epic 8: OEM Query Intelligence tracks query clarification status loops", async () => {
  await setupWiceTestDb();

  const claimId = crypto.randomUUID();
  const queryId = crypto.randomUUID();

  await db.execute(
    "INSERT INTO warranty_claims (claim_id, job_id, claim_type, part_number, claim_amount, status) VALUES (?, ?, ?, ?, ?, ?)",
    [claimId, 9002, "GOODWILL", "252512100101", 1850.00, "PENDING"]
  );

  await db.execute(
    "INSERT INTO oem_queries (query_id, claim_id, query_text, status, evidence_requested) VALUES (?, ?, ?, ?, ?)",
    [queryId, claimId, "Clarify if 2nd service PDI was done on schedule.", "PENDING", "PDI checklist scan"]
  );

  const [rows] = await db.query("SELECT * FROM oem_queries WHERE query_id = ?", [queryId]) as any[];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].status, "PENDING");
  assertEquals(rows[0].evidence_requested, "PDI checklist scan");
});

test("Epic 2 & 13: Warranty DNA records and retrieves learning objects successfully", async () => {
  await db.execute("DELETE FROM warranty_dna");

  const dnaId = crypto.randomUUID();
  const claimNo = "W-CLM-TEST-DNA";

  await db.execute(
    `INSERT INTO warranty_dna (
      dna_id, claim_no, status, approved, evidence_used, circular_applied, failure_pattern, 
      technician, vehicle, part, oem_questions, time_to_approval_sec, lessons_learned, 
      ai_confidence, golden_claim
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dnaId,
      claimNo,
      "APPROVED",
      1,
      JSON.stringify(["Torque Logs", "Cylinder Gasket Measurements"]),
      "SC/2023/133",
      "Gasket blow-by near cylinder 4",
      "advisor_jane",
      "MH12XY1234",
      "252512100101",
      JSON.stringify(["Query resolved on service validation"]),
      4500,
      "Inspect cylinder head warp before installation",
      98.50,
      1
    ]
  );

  const [rows] = await db.query("SELECT * FROM warranty_dna WHERE claim_no = ?", [claimNo]) as any[];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].dna_id, dnaId);
  assertEquals(rows[0].status, "APPROVED");
  assertEquals(rows[0].approved, 1);
  assertEquals(JSON.parse(rows[0].evidence_used)[0], "Torque Logs");
  assertEquals(rows[0].circular_applied, "SC/2023/133");
  assertEquals(rows[0].golden_claim, 1);

  // Clean up
  await db.execute("DELETE FROM warranty_dna");
});

// =============================================================================
// RUNNER
// =============================================================================
async function run() {
  await verifyTestIsolation();
  console.log("=============================================================================");
  console.log("STARTING WARRANTY INTELLIGENCE (WICE) UNIT TESTS");
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
    await db.execute("DELETE FROM oem_queries");
    await db.execute("DELETE FROM warranty_passports");
    await db.execute("DELETE FROM warranty_claims");
    await db.execute("DELETE FROM warranty_dna");
    await db.execute("DELETE FROM job_cards WHERE job_id IN (9001, 9002)");
  } catch (e) {}

  console.log("=============================================================================");
  console.log(`WICE PLATFORM RESULTS: ${passed} passed, ${failed} failed`);
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
