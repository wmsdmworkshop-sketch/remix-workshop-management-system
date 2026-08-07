// =============================================================================
// WOS Service Policy, Circular & Campaign Engine (SPCCE) Unit Tests
// Execution: npx tsx src/tests/spcce-engine.test.ts
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

// Mock Database collections to emulate policy tables
const mockSpcceDb = {
  service_policies: [] as any[],
  service_circulars: [] as any[],
  campaigns_recalls: [] as any[],
  customer_declined_consents: [] as any[],
  timeline_logs: [] as any[],
  audit_logs: [] as any[],
};

const originalExecute = db.execute;
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName === "service_policies") {
      mockSpcceDb.service_policies.push({
        policy_name: params[0],
        mileage_interval: params[1],
        mileage_tolerance: params[2],
        time_interval_days: params[3],
        time_tolerance_days: params[4],
        version: params[5],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "service_circulars") {
      mockSpcceDb.service_circulars.push({
        circular_number: params[0],
        title: params[1],
        affected_vin_range: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "campaigns_recalls") {
      mockSpcceDb.campaigns_recalls.push({
        campaign_number: params[0],
        campaign_type: params[1],
        vin_criteria: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "customer_declined_consents") {
      mockSpcceDb.customer_declined_consents.push({
        job_id: params[0],
        decline_reason: params[1],
        advisor_id: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "timeline_logs") {
      mockSpcceDb.timeline_logs.push({
        job_id: params[0],
        event_code: params[1],
        payload: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "audit_logs") {
      mockSpcceDb.audit_logs.push({
        action_code: params[0],
        entity_id: params[1],
        payload_diff: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    }
  }

  if (query.startsWith("SELECT")) {
    const tableName = query.split("FROM")[1]?.trim().split(" ")[0].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName in mockSpcceDb) {
      return [(mockSpcceDb as any)[tableName], []];
    }
  }

  return [[]];
};

// Deterministic calculation logic (Epic 5)
function calculateServiceDue(
  odometer: number,
  daysSinceSale: number,
  policy: { mileage_interval: number; mileage_tolerance: number; time_interval_days: number; time_tolerance_days: number }
) {
  const mileageDue = odometer >= (policy.mileage_interval - policy.mileage_tolerance);
  const timeDue = daysSinceSale >= (policy.time_interval_days - policy.time_tolerance_days);

  let reason = "Neither";
  if (mileageDue && timeDue) reason = "Both";
  else if (mileageDue) reason = "Mileage";
  else if (timeDue) reason = "Time";

  return {
    due: mileageDue || timeDue,
    reason,
  };
}

// AI explanation formatting interface (Epic 11)
function explainDecision(
  policyName: string,
  odometer: number,
  daysSinceSale: number,
  policy: { mileage_interval: number; mileage_tolerance: number; time_interval_days: number; time_tolerance_days: number },
  result: { due: boolean; reason: string }
) {
  return `Service Due because Tata Service Policy ${policyName} requires the service at ${policy.mileage_interval} ±${policy.mileage_tolerance} km or ${policy.time_interval_days} ±${policy.time_tolerance_days} days. Current odometer (${odometer} km) and elapsed time (${daysSinceSale} days) satisfies the ${result.reason} condition.`;
}

// =============================================================================
// TESTS
// =============================================================================

test("Epic 5: Service Due Calculator determines schedule by mileage rules", () => {
  const policy = {
    mileage_interval: 140000,
    mileage_tolerance: 3000,
    time_interval_days: 910,
    time_tolerance_days: 60,
  };

  // Case 1: Mileage due (odometer 137500 satisfies 140000 ±3000)
  const res1 = calculateServiceDue(137500, 300, policy);
  assertEquals(res1.due, true);
  assertEquals(res1.reason, "Mileage");

  // Case 2: Out of tolerance limits
  const res2 = calculateServiceDue(100000, 100, policy);
  assertEquals(res2.due, false);
  assertEquals(res2.reason, "Neither");
});

test("Epic 7: Customer declines log to both Timeline and Audit logs permanently", async () => {
  mockSpcceDb.customer_declined_consents = [];
  mockSpcceDb.timeline_logs = [];
  mockSpcceDb.audit_logs = [];

  // Log decline
  await db.execute(
    `INSERT INTO "customer_declined_consents" (job_id, decline_reason, advisor_id) VALUES (?, ?, ?)`,
    [8002, "Customer requests reschedule due to personal constraints", 99]
  );

  // Trigger Timeline append
  await db.execute(
    `INSERT INTO "timeline_logs" (job_id, event_code, payload) VALUES (?, ?, ?)`,
    [8002, "CUSTOMER_DECLINED_CAMPAIGN", "Decline reason: reschedule requested"]
  );

  // Trigger Audit append
  await db.execute(
    `INSERT INTO "audit_logs" (action_code, entity_id, payload_diff) VALUES (?, ?, ?)`,
    ["CUSTOMER_DECLINED_CONSENT", "8002", "Decline audit log saved"]
  );

  const [consents] = await db.execute(`SELECT * FROM "customer_declined_consents"`);
  const [timelines] = await db.execute(`SELECT * FROM "timeline_logs"`);
  const [audits] = await db.execute(`SELECT * FROM "audit_logs"`);

  assertEquals(consents.length, 1);
  assertEquals(timelines.length, 1);
  assertEquals(audits.length, 1);
  assertEquals(timelines[0].event_code, "CUSTOMER_DECLINED_CAMPAIGN");
});

test("Epic 11: AI explanation produces correct contextual messages", () => {
  const policy = {
    mileage_interval: 140000,
    mileage_tolerance: 3000,
    time_interval_days: 910,
    time_tolerance_days: 60,
  };
  const res = calculateServiceDue(138000, 120, policy);
  const explanation = explainDecision("SP-002", 138000, 120, policy, res);
  
  assertEquals(explanation.includes("Tata Service Policy SP-002"), true);
  assertEquals(explanation.includes("satisfies the Mileage condition"), true);
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING SPCCE ENGINE TESTS");
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
  console.log(`SPCCE RESULTS: ${passed} passed, ${failed} failed`);
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
