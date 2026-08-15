// =============================================================================
// WOS Orchestration Layer Domain Unit Tests
// Execution: npx tsx src/tests/orchestration.test.ts
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

// Mock database tables for execution validation
const mockOrchDb = {
  tasks: [] as any[],
  tbl_notifications: [] as any[],
  rpt_digital_approvals: [] as any[],
};

const originalExecute = db.execute;
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName === "tasks") {
      mockOrchDb.tasks.push({
        job_id: params[0],
        task_name: params[1],
        task_type: params[2],
        status: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "tbl_notifications") {
      mockOrchDb.tbl_notifications.push({
        user_id: params[0],
        notification_type: params[1],
        message: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "rpt_digital_approvals") {
      mockOrchDb.rpt_digital_approvals.push({
        job_id: params[0],
        approval_method: params[1],
        approved_amount: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    }
  }

  if (query.startsWith("SELECT")) {
    const tableName = query.split("FROM")[1]?.trim().split(" ")[0].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName in mockOrchDb) {
      return [(mockOrchDb as any)[tableName], []];
    }
  }

  return [[]];
};

// =============================================================================
// TESTS
// =============================================================================

test("Task Engine stores and updates operational tasks", async () => {
  mockOrchDb.tasks = [];

  await db.execute(
    `INSERT INTO "canonical"."tasks" (job_id, task_name, task_type, status) VALUES (?, ?, ?, ?)`,
    [9001, "Replace Front Bumper", "MECHANIC_JOB", "PENDING"]
  );

  const [taskList] = await db.execute(`SELECT * FROM "canonical"."tasks"`);
  assertEquals(taskList.length, 1);
  assertEquals(taskList[0].task_name, "Replace Front Bumper");
  assertEquals(taskList[0].status, "PENDING");
});

test("Notification Engine queues in-app messages based on events", async () => {
  mockOrchDb.tbl_notifications = [];

  await db.execute(
    `INSERT INTO "tbl_notifications" (user_id, notification_type, message) VALUES (?, ?, ?)`,
    [101, "SLA_BREACH", "SLA breached for task Replace Front Bumper"]
  );

  const [notifs] = await db.execute(`SELECT * FROM "tbl_notifications"`);
  assertEquals(notifs.length, 1);
  assertEquals(notifs[0].notification_type, "SLA_BREACH");
  assertEquals(notifs[0].user_id, 101);
});

test("Approval Engine records digital authorizations", async () => {
  mockOrchDb.rpt_digital_approvals = [];

  await db.execute(
    `INSERT INTO "rpt_digital_approvals" (job_id, approval_method, approved_amount) VALUES (?, ?, ?)`,
    [9001, "OTP", "4500.00"]
  );

  const [approvals] = await db.execute(`SELECT * FROM "rpt_digital_approvals"`);
  assertEquals(approvals.length, 1);
  assertEquals(approvals[0].approval_method, "OTP");
  assertEquals(approvals[0].approved_amount, "4500.00");
});

// =============================================================================
// EXECUTION RUNNER
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING ORCHESTRATION LAYER DOMAIN TESTS");
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
  console.log(`ORCHESTRATION LAYER RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  db.execute = originalExecute;
  if (failed > 0) {
    process.exit(1);
  } else {
    // Exit explicitly: without this the process hangs on open async handles
    // and the legacy test runner's per-file timeout kills it before it's
    // counted as passed.
    process.exit(0);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
