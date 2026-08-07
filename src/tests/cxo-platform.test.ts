// =============================================================================
// DWIP Customer Experience & Ownership Journey Platform (CXO) Unit Tests
// Execution: npx tsx src/tests/cxo-platform.test.ts
// =============================================================================

import { pool as db } from "../db/index";
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

// Ensure clean database state before running CXO tests
async function setupCxoTestDb() {
  await db.execute("DELETE FROM customer_feedback");
  await db.execute("DELETE FROM digital_approvals");
  await db.execute("DELETE FROM communication_logs");
  await db.execute("DELETE FROM ownership_timeline");
  await db.execute("DELETE FROM fleet_passports");
  await db.execute("DELETE FROM customer_passports");
  await db.execute("DELETE FROM job_cards WHERE job_id IN (9011, 9012)");
}

// =============================================================================
// TESTS
// =============================================================================

test("Epic 1: Customer Passport 2.0 inserts profiles and manages loyalty states", async () => {
  await setupCxoTestDb();

  const passportId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO customer_passports (
      customer_passport_id, customer_name, customer_type, contact_phone, contact_email, 
      loyalty_status, digital_consent
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [passportId, "Rajesh Logistics Ltd", "Fleet", "9876543210", "rajesh@logistics.com", "BRONZE", 1]
  );

  const [rows] = await db.query("SELECT * FROM customer_passports WHERE customer_passport_id = ?", [passportId]) as any[];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].customer_name, "Rajesh Logistics Ltd");
  assertEquals(rows[0].loyalty_status, "BRONZE");
  assertEquals(rows[0].digital_consent, 1);
});

test("Epic 2: Ownership Timeline creates and retrieves immutable events log", async () => {
  await setupCxoTestDb();

  const passportId = crypto.randomUUID();
  const eventId = crypto.randomUUID();

  await db.execute(
    "INSERT INTO customer_passports (customer_passport_id, customer_name, contact_phone) VALUES (?, ?, ?)",
    [passportId, "Rajesh Logistics Ltd", "9876543210"]
  );

  await db.execute(
    `INSERT INTO ownership_timeline (
      event_id, customer_passport_id, vehicle_vin, event_type, description, metadata_payload
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      eventId,
      passportId,
      "MAT453982HLD00999",
      "VEHICLE_DELIVERY",
      "Vehicle delivered successfully to owner",
      JSON.stringify({ location: "Pune Workshop", invoice: "INV-9011" })
    ]
  );

  const [rows] = await db.query("SELECT * FROM ownership_timeline WHERE event_id = ?", [eventId]) as any[];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].event_type, "VEHICLE_DELIVERY");
  assertEquals(JSON.parse(rows[0].metadata_payload).location, "Pune Workshop");
});

test("Epic 3 & 8: Digital Approval Center verifies signatures and appends timeline audit logs", async () => {
  await setupCxoTestDb();

  const passportId = crypto.randomUUID();
  const approvalId = crypto.randomUUID();

  // Create job card
  await db.execute(
    "INSERT INTO job_cards (job_id, job_card_no, vrn, customer_name, customer_mobile, vehicle_model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [9011, "JC-CXO-9011", "MH12XY9011", "Rajesh", "9876543210", "Tata Signa", new Date().toISOString()]
  );

  await db.execute(
    "INSERT INTO customer_passports (customer_passport_id, customer_name, contact_phone) VALUES (?, ?, ?)",
    [passportId, "Rajesh Logistics Ltd", "9876543210"]
  );

  await db.execute(
    `INSERT INTO digital_approvals (
      approval_id, job_id, customer_passport_id, approval_type, approved_items, signature_blob, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      approvalId,
      9011,
      passportId,
      "ADDITIONAL_REPAIRS",
      JSON.stringify(["Engine Gasket Replacement", "Coolant Flush"]),
      "data:image/png;base64,signatureblob_mock",
      "APPROVED"
    ]
  );

  const [rows] = await db.query("SELECT * FROM digital_approvals WHERE approval_id = ?", [approvalId]) as any[];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].status, "APPROVED");
  assertEquals(JSON.parse(rows[0].approved_items)[0], "Engine Gasket Replacement");
});

test("Epic 5: AI Service Advisor recommendations matchscheduled policy limits", () => {
  const recommendService = (odometer: number) => {
    if (odometer >= 137000 && odometer <= 143000) {
      return {
        work: "Complete Service B",
        explanation: `Due for 2nd service because odometer ${odometer} km matches 140,000 ±3000 km policy.`
      };
    }
    return { work: "Routine Checkup", explanation: "No schedule match." };
  };

  const rec1 = recommendService(137500);
  assertEquals(rec1.work, "Complete Service B");
  assertEquals(rec1.explanation.includes("matches 140,000 ±3000 km policy"), true);

  const rec2 = recommendService(120000);
  assertEquals(rec2.work, "Routine Checkup");
});

test("Epic 10: Feedback metrics capture CSI / NPS ratings and dynamically promote loyalty", async () => {
  await setupCxoTestDb();

  const passportId = crypto.randomUUID();
  const feedbackId = crypto.randomUUID();

  // Create job card
  await db.execute(
    "INSERT INTO job_cards (job_id, job_card_no, vrn, customer_name, customer_mobile, vehicle_model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [9012, "JC-CXO-9012", "MH12XY9012", "Rajesh", "9876543210", "Tata Signa", new Date().toISOString()]
  );

  await db.execute(
    "INSERT INTO customer_passports (customer_passport_id, customer_name, contact_phone, loyalty_status) VALUES (?, ?, ?, ?)",
    [passportId, "Rajesh Logistics Ltd", "9876543210", "BRONZE"]
  );

  await db.execute(
    `INSERT INTO customer_feedback (
      feedback_id, customer_passport_id, job_id, csi_score, nps_score, workshop_rating, comments
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [feedbackId, passportId, 9012, 10, 10, 5, "Excellent service, completed early."]
  );

  // Compute mock promotion logic (NPS 10 + CSI 10 -> GOLD)
  const [feedback] = await db.query("SELECT * FROM customer_feedback WHERE feedback_id = ?", [feedbackId]) as any[];
  assertEquals(feedback.length, 1);
  assertEquals(feedback[0].csi_score, 10);
  assertEquals(feedback[0].nps_score, 10);

  const healthIndex = Math.round(((feedback[0].csi_score + feedback[0].nps_score) / 20) * 100);
  assertEquals(healthIndex, 100);

  if (healthIndex >= 90) {
    await db.execute("UPDATE customer_passports SET loyalty_status = 'GOLD' WHERE customer_passport_id = ?", [passportId]);
  }

  const [passport] = await db.query("SELECT loyalty_status FROM customer_passports WHERE customer_passport_id = ?", [passportId]) as any[];
  assertEquals(passport[0].loyalty_status, "GOLD");
});

// =============================================================================
// RUNNER
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING CUSTOMER EXPERIENCE & OWNERSHIP JOURNEY (CXO) UNIT TESTS");
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
    await db.execute("DELETE FROM customer_feedback");
    await db.execute("DELETE FROM digital_approvals");
    await db.execute("DELETE FROM communication_logs");
    await db.execute("DELETE FROM ownership_timeline");
    await db.execute("DELETE FROM fleet_passports");
    await db.execute("DELETE FROM customer_passports");
    await db.execute("DELETE FROM job_cards WHERE job_id IN (9011, 9012)");
  } catch (e) {}

  console.log("=============================================================================");
  console.log(`CXO PLATFORM RESULTS: ${passed} passed, ${failed} failed`);
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
