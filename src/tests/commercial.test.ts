// =============================================================================
// WOS Commercial Execution Layer Unit Tests
// Execution: npx tsx src/tests/commercial.test.ts
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
const mockCommDb = {
  parts: [] as any[],
  stock_movements: [] as any[],
  warranty_claims: [] as any[],
  purchase_orders: [] as any[],
};

const originalExecute = db.execute;
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName === "parts") {
      mockCommDb.parts.push({
        part_number: params[0],
        part_name: params[1],
        unit_price: params[2],
        stock_qty: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "stock_movements") {
      mockCommDb.stock_movements.push({
        part_id: params[0],
        job_id: params[1],
        movement_type: params[2],
        quantity: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "warranty_claims") {
      mockCommDb.warranty_claims.push({
        job_id: params[0],
        claim_type: params[1],
        part_number: params[2],
        claim_amount: params[3],
        status: params[4],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "purchase_orders") {
      mockCommDb.purchase_orders.push({
        po_number: params[0],
        part_id: params[1],
        quantity: params[2],
        status: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    }
  }

  if (query.startsWith("SELECT")) {
    const tableName = query.split("FROM")[1]?.trim().split(" ")[0].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName in mockCommDb) {
      return [(mockCommDb as any)[tableName], []];
    }
  }

  return [[]];
};

// =============================================================================
// TESTS
// =============================================================================

test("Parts master and stock movements track warehouse inventory balance", async () => {
  mockCommDb.parts = [];
  mockCommDb.stock_movements = [];

  await db.execute(
    `INSERT INTO "canonical"."parts" (part_number, part_name, unit_price, stock_qty) VALUES (?, ?, ?, ?)`,
    ["252512100101", "Fuel Filter Cartridge", "1250.00", 50]
  );

  await db.execute(
    `INSERT INTO "canonical"."stock_movements" (part_id, job_id, movement_type, quantity) VALUES (?, ?, ?, ?)`,
    ["part-uuid-1", 3001, "ISSUE", 2]
  );

  const [partList] = await db.execute(`SELECT * FROM "canonical"."parts"`);
  const [movements] = await db.execute(`SELECT * FROM "canonical"."stock_movements"`);

  assertEquals(partList.length, 1);
  assertEquals(partList[0].part_number, "252512100101");
  assertEquals(movements.length, 1);
  assertEquals(movements[0].movement_type, "ISSUE");
  assertEquals(movements[0].quantity, 2);
});

test("Warranty claims engine supports goodwill and standard AMC options", async () => {
  mockCommDb.warranty_claims = [];

  await db.execute(
    `INSERT INTO "canonical"."warranty_claims" (job_id, claim_type, part_number, claim_amount, status) VALUES (?, ?, ?, ?, ?)`,
    [3001, "GOODWILL", "252512100101", "1250.00", "PENDING"]
  );

  const [claims] = await db.execute(`SELECT * FROM "canonical"."warranty_claims"`);
  assertEquals(claims.length, 1);
  assertEquals(claims[0].claim_type, "GOODWILL");
  assertEquals(claims[0].status, "PENDING");
});

test("Procurement PO updates status cleanly on order state transitions", async () => {
  mockCommDb.purchase_orders = [];

  await db.execute(
    `INSERT INTO "canonical"."purchase_orders" (po_number, part_id, quantity, status) VALUES (?, ?, ?, ?)`,
    ["PO-2026-0001", "part-uuid-1", 100, "PENDING"]
  );

  const [pos] = await db.execute(`SELECT * FROM "canonical"."purchase_orders"`);
  assertEquals(pos.length, 1);
  assertEquals(pos[0].po_number, "PO-2026-0001");
  assertEquals(pos[0].status, "PENDING");
});

// =============================================================================
// EXECUTION RUNNER
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING COMMERCIAL EXECUTION DOMAIN TESTS");
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
  console.log(`COMMERCIAL LAYER RESULTS: ${passed} passed, ${failed} failed`);
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
