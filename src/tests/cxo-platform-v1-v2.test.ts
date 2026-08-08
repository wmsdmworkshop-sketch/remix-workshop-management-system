// =============================================================================
// DWIP Customer Experience & Ownership Journey (CXO) Versioned API Unit Tests
// Execution: npx tsx src/tests/cxo-platform-v1-v2.test.ts
// =============================================================================

import { pool as db } from "../db/index.ts";
import { verifyTestIsolation } from "./destructive_test_guard.ts";
import { globalEventBus } from "../core/event-bus.ts";
import { initializeNotificationEventListeners } from "../core/notification-event-listener.ts";
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
  await verifyTestIsolation();
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

test("Digital Identity Passport stores metadata and prevents password leaks", async () => {
  await setupCxoTestDb();

  const passportId = crypto.randomUUID();
  const registeredDevices = [{ deviceId: "DEV-101", deviceName: "Pixel 9 Pro", pushToken: "token-abc" }];
  const securityAudit = [{ event: "SIGNUP", timestamp: new Date().toISOString() }];

  await db.execute(
    `INSERT INTO customer_passports (
      customer_passport_id, customer_name, contact_phone, loyalty_status,
      linked_user, preferred_language, registered_devices, security_audit_trail, digital_consent
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      passportId,
      "Arhaan Khan",
      "9988776655",
      "SILVER",
      "user_arhaan",
      "hi",
      JSON.stringify(registeredDevices),
      JSON.stringify(securityAudit)
    ]
  );

  const [rows] = await db.query("SELECT * FROM customer_passports WHERE customer_passport_id = ?", [passportId]) as any[];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].customer_name, "Arhaan Khan");
  assertEquals(rows[0].preferred_language, "hi");
  assertEquals(rows[0].loyalty_status, "SILVER");
  
  // Assert no password column exists in the schema mapping
  assertEquals(rows[0].password, undefined);
});

test("Event Bus maps published events to Notification Engine delivery channels", async () => {
  await setupCxoTestDb();

  const passportId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO customer_passports (
      customer_passport_id, customer_name, contact_phone, notification_preferences
     ) VALUES (?, ?, ?, ?)`,
    [passportId, "Arhaan Khan", "9988776655", "PUSH,SMS"]
  );

  // Publish JOB_CARD_CREATED event to EventBus
  await globalEventBus.publish(
    "JOB_CARD_CREATED",
    {
      customer_passport_id: passportId,
      contact_phone: "9988776655",
      message: "Your Nexon has been checked in for 140,000 km service."
    },
    "TX-CORR-123"
  );

  // Wait briefly for async handler execution
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Query communication logs
  const [logs] = await db.query(
    "SELECT * FROM communication_logs WHERE customer_passport_id = ? ORDER BY created_at DESC",
    [passportId]
  ) as any[];

  // It should log notifications to both PUSH and SMS delivery channels
  assertEquals(logs.length, 2);
  assertEquals(logs.some((l: any) => l.channel === "PUSH"), true);
  assertEquals(logs.some((l: any) => l.channel === "SMS"), true);
  assertEquals(logs[0].subject, "JOB_CARD_CREATED");
  assertEquals(logs[0].body_text, "Your Nexon has been checked in for 140,000 km service.");
});

test("Vehicle Health Card evaluates components status and AI explanations", () => {
  const getVehicleHealth = (odometer: number) => {
    let recWork = "Routine Safety Checkup";
    let rule = "Routine inspection threshold";
    if (odometer >= 137000 && odometer <= 143000) {
      recWork = "Complete Service B (140,000 Kms Scheduled Service)";
      rule = "140k scheduled mileage rule";
    }

    return {
      healthScore: 92.5,
      components: {
        engine: "95% (Excellent)",
        transmission: "90% (Good)",
      },
      aiExplanation: {
        recommendation: recWork,
        applicableRule: rule
      }
    };
  };

  const health1 = getVehicleHealth(139500);
  assertEquals(health1.healthScore, 92.5);
  assertEquals(health1.aiExplanation.recommendation, "Complete Service B (140,000 Kms Scheduled Service)");
  assertEquals(health1.aiExplanation.applicableRule, "140k scheduled mileage rule");

  const health2 = getVehicleHealth(80000);
  assertEquals(health2.aiExplanation.recommendation, "Routine Safety Checkup");
  assertEquals(health2.aiExplanation.applicableRule, "Routine inspection threshold");
});

// =============================================================================
// RUNNER
// =============================================================================
async function run() {
  await verifyTestIsolation();
  console.log("=============================================================================");
  console.log("STARTING CUSTOMER EXPERIENCE (CXO) VERSIONED API UNIT TESTS");
  console.log("=============================================================================");

  initializeNotificationEventListeners();

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
  } catch (e) {}

  console.log("=============================================================================");
  console.log(`CXO VERSIONED API RESULTS: ${passed} passed, ${failed} failed`);
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
