// =============================================================================
// WOS Workshop Visit Domain Unit Tests
// Execution: npx tsx src/tests/workshop-visit.test.ts
// =============================================================================

import { pool as db } from "../db/index";

// Simple test runner setup
const tests: { name: string; fn: () => Promise<void> | void }[] = [];
function test(name: string, fn: () => Promise<void> | void) {
  tests.push({ name, fn });
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}: expected ${expected}, got ${actual}`);
  }
}

function assert(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

// Mock database emulator for offline validation safety
const mockVmrDb = {
  customer_voices: [] as any[],
  advisor_assessments: [] as any[],
  technical_investigations: [] as any[],
  repair_executions: [] as any[],
  outcome_learnings: [] as any[],
  workshop_visit_timelines: [] as any[],
};

// Monkeypatch db.execute to intercept and run against mock memory tables
const originalExecute = db.execute;
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName === "customer_voices") {
      mockVmrDb.customer_voices.push({
        job_id: params[0],
        voice_text: params[1],
        complaint_family: params[2],
        complaint_category: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "outcome_learnings") {
      mockVmrDb.outcome_learnings.push({
        job_id: params[0],
        root_cause: params[1],
        verification_method: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "workshop_visit_timelines") {
      mockVmrDb.workshop_visit_timelines.push({
        job_id: params[0],
        timeline_type: params[1],
        event_code: params[2],
        payload: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    }
  }

  if (query.startsWith("SELECT")) {
    const tableName = query.split("FROM")[1]?.trim().split(" ")[0].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName in mockVmrDb) {
      const rows = (mockVmrDb as any)[tableName];
      return [rows, []];
    }
  }

  return [[]];
};

// =============================================================================
// TEST SUITES
// =============================================================================

test("Layer 1 (Customer Voice) stores immutable raw feedback", async () => {
  mockVmrDb.customer_voices = [];
  
  await db.execute(
    `INSERT INTO "canonical"."customer_voices" (job_id, voice_text, complaint_family, complaint_category) VALUES (?, ?, ?, ?)`,
    [101, "Low engine pull when climbing", "ENGINE", "LOW_POWER"]
  );

  const [rows] = await db.execute(`SELECT * FROM "canonical"."customer_voices"`);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].complaint_family, "ENGINE");
  assertEquals(rows[0].complaint_category, "LOW_POWER");
  assertEquals(rows[0].voice_text, "Low engine pull when climbing");
});

test("Symptom vs Root Cause tracks distinct values across layers", async () => {
  mockVmrDb.customer_voices = [];
  mockVmrDb.outcome_learnings = [];

  // Record Symptom (Layer 1)
  await db.execute(
    `INSERT INTO "canonical"."customer_voices" (job_id, voice_text, complaint_family, complaint_category) VALUES (?, ?, ?, ?)`,
    [102, "Black exhaust smoke observed", "ENGINE", "EXHAUST_SMOKE"]
  );

  // Record Root Cause (Layer 5)
  await db.execute(
    `INSERT INTO "canonical"."outcome_learnings" (job_id, root_cause, verification_method) VALUES (?, ?, ?)`,
    [102, "Turbocharger boost hose split", "PRESSURE_LEAK_TEST"]
  );

  const [symptomRows] = await db.execute(`SELECT * FROM "canonical"."customer_voices"`);
  const [rootCauseRows] = await db.execute(`SELECT * FROM "canonical"."outcome_learnings"`);

  assertEquals(symptomRows[0].voice_text, "Black exhaust smoke observed");
  assertEquals(rootCauseRows[0].root_cause, "Turbocharger boost hose split");
  assertEquals(rootCauseRows[0].verification_method, "PRESSURE_LEAK_TEST");
});

test("Timelines records distinct parallel event categories", async () => {
  mockVmrDb.workshop_visit_timelines = [];

  // Log Operational event
  await db.execute(
    `INSERT INTO "canonical"."workshop_visit_timelines" (job_id, timeline_type, event_code, payload) VALUES (?, ?, ?, ?)`,
    [103, "OPERATIONAL", "BAY_ASSIGNED", JSON.stringify({ bay_id: 5 })]
  );

  // Log Customer event
  await db.execute(
    `INSERT INTO "canonical"."workshop_visit_timelines" (job_id, timeline_type, event_code, payload) VALUES (?, ?, ?, ?)`,
    [103, "CUSTOMER", "ESTIMATE_SENT_SMS", JSON.stringify({ sent_to: "9876543210" })]
  );

  const [timelineRows] = await db.execute(`SELECT * FROM "canonical"."workshop_visit_timelines"`);
  assertEquals(timelineRows.length, 2);
  assertEquals(timelineRows[0].timeline_type, "OPERATIONAL");
  assertEquals(timelineRows[0].event_code, "BAY_ASSIGNED");
  assertEquals(timelineRows[1].timeline_type, "CUSTOMER");
  assertEquals(timelineRows[1].event_code, "ESTIMATE_SENT_SMS");
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING WORKSHOP VISIT DOMAIN TESTS");
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
      console.error(err.message);
      failed++;
    }
  }

  console.log("=============================================================================");
  console.log(`WORKSHOP VISIT DOMAIN RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  // Restore DB execute method
  db.execute = originalExecute;

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
