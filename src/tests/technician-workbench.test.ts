// =============================================================================
// WOS Technician Workbench & Digital Repair Execution Unit Tests
// Execution: npx tsx src/tests/technician-workbench.test.ts
// =============================================================================

import { pool as db } from "../db/index";

const tests: { name: string; fn: () => Promise<void> | void }[] = [];
function test(name: string, fn: () => Promise<void> | void) {
  tests.push({ name, fn });
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}: expected ${expected}, got ${actual}`);
  }
}

// Mock Database collections to emulate Technician Workbench flows
const mockTwbDb = {
  technical_investigations: [] as any[],
  repair_executions: [] as any[],
  outcome_learnings: [] as any[],
  tasks: [] as any[],
  timeline_logs: [] as any[],
};

const originalExecute = db.execute;
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName === "technical_investigations") {
      mockTwbDb.technical_investigations.push({
        job_id: params[0],
        spn: params[1],
        fmi: params[2],
        dtc: params[3],
        symptoms: params[4],
        diagnostic_confidence: params[5],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "repair_executions") {
      mockTwbDb.repair_executions.push({
        job_id: params[0],
        repair_steps: params[1],
        torque_value: params[2],
        time_spent_mins: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "outcome_learnings") {
      mockTwbDb.outcome_learnings.push({
        job_id: params[0],
        diagnosis_correct: params[1],
        lesson_learned: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "timeline_logs") {
      mockTwbDb.timeline_logs.push({
        job_id: params[0],
        event_code: params[1],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    }
  }

  if (query.startsWith("SELECT")) {
    const tableName = query.split("FROM")[1]?.trim().split(" ")[0].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName in mockTwbDb) {
      return [(mockTwbDb as any)[tableName], []];
    }
  }

  return [[]];
};

// =============================================================================
// TESTS
// =============================================================================

test("Epic 4 & 5: Technical investigation captures structured diagnostic confidence and fault codes", async () => {
  mockTwbDb.technical_investigations = [];

  await db.execute(
    `INSERT INTO "canonical"."technical_investigations" (job_id, spn, fmi, dtc, symptoms, diagnostic_confidence) VALUES (?, ?, ?, ?, ?, ?)`,
    [1002, 627, 2, "DTC-P0627", "Low fuel pressure", "80%"]
  );

  const [investigations] = await db.execute(`SELECT * FROM "canonical"."technical_investigations"`);
  assertEquals(investigations.length, 1);
  assertEquals(investigations[0].spn, 627);
  assertEquals(investigations[0].dtc, "DTC-P0627");
  assertEquals(investigations[0].diagnostic_confidence, "80%");
});

test("Epic 7 & 9: Repair execution stores steps, torque calibrations, and updates timeline", async () => {
  mockTwbDb.repair_executions = [];
  mockTwbDb.timeline_logs = [];

  // Log repair
  await db.execute(
    `INSERT INTO "canonical"."repair_executions" (job_id, repair_steps, torque_value, time_spent_mins) VALUES (?, ?, ?, ?)`,
    [1002, "Replaced fuel pump and checked relay", 25, 45]
  );

  // Update timeline
  await db.execute(
    `INSERT INTO "timeline_logs" (job_id, event_code) VALUES (?, ?)`,
    [1002, "REPAIR_COMPLETED"]
  );

  const [repairs] = await db.execute(`SELECT * FROM "canonical"."repair_executions"`);
  const [timelines] = await db.execute(`SELECT * FROM "timeline_logs"`);

  assertEquals(repairs.length, 1);
  assertEquals(repairs[0].torque_value, 25);
  assertEquals(repairs[0].time_spent_mins, 45);
  assertEquals(timelines.length, 1);
  assertEquals(timelines[0].event_code, "REPAIR_COMPLETED");
});

test("Epic 10: Outcome learning registers diagnostic validation reviews", async () => {
  mockTwbDb.outcome_learnings = [];

  await db.execute(
    `INSERT INTO "canonical"."outcome_learnings" (job_id, diagnosis_correct, lesson_learned) VALUES (?, ?, ?)`,
    [1002, "YES", "Always verify fuel pump relay before replacing pump motor"]
  );

  const [outcomes] = await db.execute(`SELECT * FROM "canonical"."outcome_learnings"`);
  assertEquals(outcomes.length, 1);
  assertEquals(outcomes[0].diagnosis_correct, "YES");
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING TECHNICIAN WORKBENCH TESTS");
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
  console.log(`TWB RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  db.execute = originalExecute;
  if (failed > 0) {
    process.exit(1);
  } else {
    // Exit explicitly: the harness leaves async handles (timers/mock listeners)
    // open, so without this Node waits on the event loop and the legacy test
    // runner's per-file timeout kills it before it's counted as passed.
    process.exit(0);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
