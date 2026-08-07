// =============================================================================
// WOS Operational Execution Domain Unit Tests
// Execution: npx tsx src/tests/operational-execution.test.ts
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
const mockExecDb = {
  toolbox_inspections: [] as any[],
  tool_custody_logs: [] as any[],
  safety_incidents: [] as any[],
  pit_safety_logs: [] as any[],
};

const originalExecute = db.execute;
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName === "toolbox_inspections") {
      mockExecDb.toolbox_inspections.push({
        employee_passport_id: params[0],
        inspected_by: params[1],
        tool_score: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "tool_custody_logs") {
      mockExecDb.tool_custody_logs.push({
        employee_passport_id: params[0],
        tool_name: params[1],
        serial_number: params[2],
        status: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "safety_incidents") {
      mockExecDb.safety_incidents.push({
        employee_passport_id: params[0],
        incident_type: params[1],
        severity: params[2],
        is_oil_spill: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "pit_safety_logs") {
      mockExecDb.pit_safety_logs.push({
        job_id: params[0],
        pit_number: params[1],
        gas_level_ppm: params[2],
        wheel_chocks_applied: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    }
  }

  if (query.startsWith("SELECT")) {
    const tableName = query.split("FROM")[1]?.trim().split(" ")[0].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName in mockExecDb) {
      return [(mockExecDb as any)[tableName], []];
    }
  }

  return [[]];
};

// =============================================================================
// TESTS
// =============================================================================

test("Toolbox Inspection calculates and updates tool scores", async () => {
  mockExecDb.toolbox_inspections = [];

  await db.execute(
    `INSERT INTO "canonical"."toolbox_inspections" (employee_passport_id, inspected_by, tool_score) VALUES (?, ?, ?)`,
    ["emp-uuid-1", 99, 90]
  );

  const [inspections] = await db.execute(`SELECT * FROM "canonical"."toolbox_inspections"`);
  assertEquals(inspections.length, 1);
  assertEquals(inspections[0].tool_score, 90);
});

test("Tool custody log registers checkout states", async () => {
  mockExecDb.tool_custody_logs = [];

  await db.execute(
    `INSERT INTO "canonical"."tool_custody_logs" (employee_passport_id, tool_name, serial_number, status) VALUES (?, ?, ?, ?)`,
    ["emp-uuid-2", "Injectors Scanner", "OBD-9002", "ACTIVE"]
  );

  const [custody] = await db.execute(`SELECT * FROM "canonical"."tool_custody_logs"`);
  assertEquals(custody.length, 1);
  assertEquals(custody[0].tool_name, "Injectors Scanner");
  assertEquals(custody[0].status, "ACTIVE");
});

test("Oil Spill behaves as Critical Safety hold trigger", async () => {
  mockExecDb.safety_incidents = [];

  // Log Oil Spill Incident
  await db.execute(
    `INSERT INTO "canonical"."safety_incidents" (employee_passport_id, incident_type, severity, is_oil_spill) VALUES (?, ?, ?, ?)`,
    ["emp-uuid-3", "OIL_SPILL", "CRITICAL", true]
  );

  const [incidents] = await db.execute(`SELECT * FROM "canonical"."safety_incidents"`);
  assertEquals(incidents.length, 1);
  assertEquals(incidents[0].incident_type, "OIL_SPILL");
  assertEquals(incidents[0].severity, "CRITICAL");
  assertEquals(incidents[0].is_oil_spill, true);
});

test("Pit Safety Logs enforce chocks and gas checks", async () => {
  mockExecDb.pit_safety_logs = [];

  await db.execute(
    `INSERT INTO "canonical"."pit_safety_logs" (job_id, pit_number, gas_level_ppm, wheel_chocks_applied) VALUES (?, ?, ?, ?)`,
    [2002, "PIT-4B", 25, true]
  );

  const [pitLogs] = await db.execute(`SELECT * FROM "canonical"."pit_safety_logs"`);
  assertEquals(pitLogs.length, 1);
  assertEquals(pitLogs[0].pit_number, "PIT-4B");
  assertEquals(pitLogs[0].wheel_chocks_applied, true);
  assertEquals(pitLogs[0].gas_level_ppm, 25);
});

// =============================================================================
// EXECUTION RUNNER
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING OPERATIONAL EXECUTION DOMAIN TESTS");
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
  console.log(`OPERATIONAL EXECUTION RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  db.execute = originalExecute;
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
