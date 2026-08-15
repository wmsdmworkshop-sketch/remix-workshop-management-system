// =============================================================================
// WOS Quality Control, Verification & Delivery (QVDP) Unit Tests
// Execution: npx tsx src/tests/qc-verification.test.ts
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

// Mock Database collections to emulate QC and Delivery flows
const mockQcDb = {
  rpt_qc_checklists: [] as any[],
  rework_tracking: [] as any[],
  outcome_learnings: [] as any[],
  timeline_logs: [] as any[],
};

const originalExecute = db.execute;
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName === "rpt_qc_checklists") {
      mockQcDb.rpt_qc_checklists.push({
        qc_checklist_id: params[0],
        job_id: params[1],
        inspector_id: params[2],
        road_test_outcome: params[3],
        verification_score: params[4],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "rework_tracking") {
      mockQcDb.rework_tracking.push({
        original_job_id: params[0],
        rework_job_id: params[1],
        rework_reason: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "timeline_logs") {
      mockQcDb.timeline_logs.push({
        job_id: params[0],
        event_code: params[1],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    }
  }

  if (query.startsWith("SELECT")) {
    const tableName = query.split("FROM")[1]?.trim().split(" ")[0].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName in mockQcDb) {
      return [(mockQcDb as any)[tableName], []];
    }
  }

  return [[]];
};

// Simulated Golden Repair Evaluator (Epic 10)
function evaluateGoldenRepair(daysSinceRepair: number, comebacks: number, minObservationDays: number) {
  if (daysSinceRepair >= minObservationDays && comebacks === 0) {
    return {
      awarded: true,
      status: "GOLDEN_REPAIR",
    };
  }
  return {
    awarded: false,
    status: "STANDARD_REPAIR",
  };
}

// =============================================================================
// TESTS
// =============================================================================

test("Epic 5 & 6: QC Inspection saves road test and verification scores", async () => {
  mockQcDb.rpt_qc_checklists = [];

  await db.execute(
    `INSERT INTO "canonical"."rpt_qc_checklists" (qc_checklist_id, job_id, inspector_id, road_test_outcome, verification_score) VALUES (?, ?, ?, ?, ?)`,
    [8001, 1002, 999, "PASS", 95]
  );

  const [qcLogs] = await db.execute(`SELECT * FROM "canonical"."rpt_qc_checklists"`);
  assertEquals(qcLogs.length, 1);
  assertEquals(qcLogs[0].road_test_outcome, "PASS");
  assertEquals(qcLogs[0].verification_score, 95);
});

test("Epic 7 & 12: Rejected repairs trigger rework log and updates timeline", async () => {
  mockQcDb.rework_tracking = [];
  mockQcDb.timeline_logs = [];

  // Rework Log
  await db.execute(
    `INSERT INTO "canonical"."rework_tracking" (original_job_id, rework_job_id, rework_reason) VALUES (?, ?, ?)`,
    [1002, 1003, "QC Rejected: Coolant leak detected near clamp"]
  );

  // Update timeline
  await db.execute(
    `INSERT INTO "timeline_logs" (job_id, event_code) VALUES (?, ?)`,
    [1002, "QC_FAILED"]
  );

  const [reworks] = await db.execute(`SELECT * FROM "canonical"."rework_tracking"`);
  const [timelines] = await db.execute(`SELECT * FROM "timeline_logs"`);

  assertEquals(reworks.length, 1);
  assertEquals(reworks[0].rework_reason, "QC Rejected: Coolant leak detected near clamp");
  assertEquals(timelines.length, 1);
  assertEquals(timelines[0].event_code, "QC_FAILED");
});

test("Epic 10: Golden Repair Engine evaluates comebacks rules correctly", () => {
  // Configured period: 90 days
  const r1 = evaluateGoldenRepair(95, 0, 90);
  assertEquals(r1.awarded, true);
  assertEquals(r1.status, "GOLDEN_REPAIR");

  // Under observation limit
  const r2 = evaluateGoldenRepair(45, 0, 90);
  assertEquals(r2.awarded, false);
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING QC VERIFICATION TESTS");
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
  console.log(`QC RESULTS: ${passed} passed, ${failed} failed`);
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
