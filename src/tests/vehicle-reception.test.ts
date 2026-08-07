// =============================================================================
// WOS Vehicle Reception & Digital Job Card Journey Unit Tests
// Execution: npx tsx src/tests/vehicle-reception.test.ts
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

// Mock Database collections to emulate Reception flows
const mockRecDb = {
  vehicle_passports: [] as any[],
  customer_passports: [] as any[],
  job_cards: [] as any[],
  customer_voices: [] as any[],
  advisor_assessments: [] as any[],
  timeline_logs: [] as any[],
};

const originalExecute = db.execute;
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName === "job_cards") {
      mockRecDb.job_cards.push({
        job_id: params[0],
        vehicle_reg: params[1],
        status: params[2],
        advisor_id: params[3],
        estimated_amount: params[4],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "customer_voices") {
      mockRecDb.customer_voices.push({
        job_id: params[0],
        complaint_code: params[1],
        severity: params[2],
        is_repeat: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "advisor_assessments") {
      mockRecDb.advisor_assessments.push({
        job_id: params[0],
        fuel_level: params[1],
        tyre_condition: params[2],
        damage_notes: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "timeline_logs") {
      mockRecDb.timeline_logs.push({
        job_id: params[0],
        event_code: params[1],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    }
  }

  if (query.startsWith("SELECT")) {
    const tableName = query.split("FROM")[1]?.trim().split(" ")[0].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName in mockRecDb) {
      return [(mockRecDb as any)[tableName], []];
    }
  }

  return [[]];
};

// Simulated Repeat Complaint Detector (Epic 6)
function detectRepeatComplaint(currentComplaint: string, history: any[]) {
  const match = history.find(h => h.complaint.toLowerCase() === currentComplaint.toLowerCase());
  if (match) {
    return {
      isRepeat: true,
      confidence: 95,
      previousResolution: match.resolution,
    };
  }
  return {
    isRepeat: false,
    confidence: 0,
    previousResolution: null,
  };
}

// Simulated Bay Recommendation Engine (Epic 10)
function recommendBay(requirement: string, baysList: any[]) {
  // Filters active/available bays that match vehicle size or skill requisites
  return baysList
    .filter(b => b.is_active && b.bay_type === requirement)
    .map(b => ({
      bay_id: b.bay_id,
      bay_name: b.bay_name,
      score: 100, // perfect fit recommendation
    }));
}

// =============================================================================
// TESTS
// =============================================================================

test("Epic 6: Repeat Complaint Engine detects identical logs from history", () => {
  const history = [
    { complaint: "Low power output", resolution: "Cleaned turbo wastegate valve" },
    { complaint: "Air brake squeal", resolution: "Replaced brake pads" },
  ];

  const result = detectRepeatComplaint("Low power output", history);
  assertEquals(result.isRepeat, true);
  assertEquals(result.confidence, 95);
  assertEquals(result.previousResolution, "Cleaned turbo wastegate valve");

  const result2 = detectRepeatComplaint("Coolant leak", history);
  assertEquals(result2.isRepeat, false);
});

test("Epic 10: Bay Allocations recommends matching open pits/bays", () => {
  const baysList = [
    { bay_id: 1, bay_name: "HCV Pit 1", bay_type: "HCV_PIT", is_active: true },
    { bay_id: 2, bay_name: "ILCV Pit 2", bay_type: "ILCV_PIT", is_active: true },
    { bay_id: 3, bay_name: "Washing Bay", bay_type: "WASH", is_active: false },
  ];

  const recommended = recommendBay("HCV_PIT", baysList);
  assertEquals(recommended.length, 1);
  assertEquals(recommended[0].bay_name, "HCV Pit 1");
});

test("Epic 9 & 11: Reception journey stores structured Job Card and generates Timeline audits", async () => {
  mockRecDb.job_cards = [];
  mockRecDb.customer_voices = [];
  mockRecDb.advisor_assessments = [];
  mockRecDb.timeline_logs = [];

  // Create Job Card
  await db.execute(
    `INSERT INTO "job_cards" (job_id, vehicle_reg, status, advisor_id, estimated_amount) VALUES (?, ?, ?, ?, ?)`,
    [1002, "KA32AB5725", "INTAKE_PENDING", 99, "8500.00"]
  );

  // Walkaround
  await db.execute(
    `INSERT INTO "advisor_assessments" (job_id, fuel_level, tyre_condition, damage_notes) VALUES (?, ?, ?, ?)`,
    [1002, "50%", "GOOD", "Minor scratch on bumper"]
  );

  // Complaints
  await db.execute(
    `INSERT INTO "customer_voices" (job_id, complaint_code, severity, is_repeat) VALUES (?, ?, ?, ?)`,
    [1002, "LOW_POWER", "HIGH", true]
  );

  // Timeline
  await db.execute(
    `INSERT INTO "timeline_logs" (job_id, event_code) VALUES (?, ?)`,
    [1002, "RECEPTION_COMPLETED"]
  );

  const [cards] = await db.execute(`SELECT * FROM "job_cards"`);
  const [voices] = await db.execute(`SELECT * FROM "customer_voices"`);
  const [walkaround] = await db.execute(`SELECT * FROM "advisor_assessments"`);
  const [timelines] = await db.execute(`SELECT * FROM "timeline_logs"`);

  assertEquals(cards.length, 1);
  assertEquals(voices.length, 1);
  assertEquals(walkaround.length, 1);
  assertEquals(timelines.length, 1);
  assertEquals(timelines[0].event_code, "RECEPTION_COMPLETED");
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING VEHICLE RECEPTION JOURNEY TESTS");
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
  console.log(`RECEPTION RESULTS: ${passed} passed, ${failed} failed`);
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
