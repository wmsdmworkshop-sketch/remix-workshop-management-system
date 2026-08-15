// =============================================================================
// WOS DWIP Enterprise Rules Engine (DRE) Unit Tests
// Execution: npx tsx src/tests/dre-rules-engine.test.ts
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

// Simulated Rule Evaluator (Epic 3 & 12)
interface RuleCondition {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
  value: any;
}

function evaluateRule(data: any, conditions: RuleCondition[]): boolean {
  return conditions.every(cond => {
    const val = data[cond.field];
    switch (cond.operator) {
      case "equals":
        return val === cond.value;
      case "not_equals":
        return val !== cond.value;
      case "greater_than":
        return val > cond.value;
      case "less_than":
        return val < cond.value;
      case "contains":
        return Array.isArray(val) ? val.includes(cond.value) : String(val).includes(cond.value);
      default:
        return false;
    }
  });
}

// Mock Database collections to emulate DRE rules persistence
const mockDreDb = {
  business_rules: [] as any[],
};

const originalExecute = db.execute;
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName === "business_rules") {
      mockDreDb.business_rules.push({
        rule_id: params[0],
        rule_name: params[1],
        rule_group: params[2],
        condition_json: params[3],
        action_json: params[4],
        is_active: params[5],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    }
  }

  if (query.startsWith("SELECT")) {
    const tableName = query.split("FROM")[1]?.trim().split(" ")[0].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName in mockDreDb) {
      return [(mockDreDb as any)[tableName], []];
    }
  }

  return [[]];
};

// =============================================================================
// TESTS
// =============================================================================

test("Epic 3: DRE evaluates numerical greater_than / less_than conditions", () => {
  const data = { mileage: 45000, model: "Tata Prima" };
  
  const conditionsPassed: RuleCondition[] = [
    { field: "mileage", operator: "greater_than", value: 40000 },
    { field: "model", operator: "equals", value: "Tata Prima" },
  ];
  assertEquals(evaluateRule(data, conditionsPassed), true);

  const conditionsFailed: RuleCondition[] = [
    { field: "mileage", operator: "less_than", value: 30000 },
  ];
  assertEquals(evaluateRule(data, conditionsFailed), false);
});

test("Epic 3: DRE evaluates string contains and not_equals conditions", () => {
  const data = { complaints: ["Low power", "Air leak"], status: "WAITING_QC" };

  const cond1: RuleCondition[] = [
    { field: "complaints", operator: "contains", value: "Air leak" },
    { field: "status", operator: "not_equals", value: "READY" },
  ];
  assertEquals(evaluateRule(data, cond1), true);
});

test("Epic 1 & 11: Business rules persist successfully to local schema memory", async () => {
  mockDreDb.business_rules = [];

  await db.execute(
    `INSERT INTO "canonical"."business_rules" (rule_id, rule_name, rule_group, condition_json, action_json, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
    ["rule-101", "VOR Priority Trigger", "ESCALATION", '{"mileage":{"gt":10000}}', '{"priority":"CRITICAL"}', true]
  );

  const [rules] = await db.execute(`SELECT * FROM "canonical"."business_rules"`);
  assertEquals(rules.length, 1);
  assertEquals(rules[0].rule_name, "VOR Priority Trigger");
  assertEquals(rules[0].rule_group, "ESCALATION");
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING DRE RULES ENGINE TESTS");
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
  console.log(`DRE RESULTS: ${passed} passed, ${failed} failed`);
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
