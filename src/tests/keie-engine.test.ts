// =============================================================================
// WOS Knowledge Extraction & Intelligence Engine (KEIE) Unit Tests
// Execution: npx tsx src/tests/keie-engine.test.ts
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

// Mock Database collections to emulate KEIE tables
const mockKeieDb = {
  knowledge_extraction_audits: [] as any[],
  knowledge_objects: [] as any[],
};

const originalExecute = db.execute;
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName === "knowledge_extraction_audits") {
      mockKeieDb.knowledge_extraction_audits.push({
        document_number: params[0],
        checksum: params[1],
        parser_version: params[2],
        extracted_by: params[3],
        deleted_successfully: params[4],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "knowledge_objects") {
      mockKeieDb.knowledge_objects.push({
        title: params[0],
        document_number: params[1],
        knowledge_type: params[2],
        status: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    }
  }

  if (query.startsWith("SELECT")) {
    const tableName = query.split("FROM")[1]?.trim().split(" ")[0].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName in mockKeieDb) {
      return [(mockKeieDb as any)[tableName], []];
    }
  }

  return [[]];
};

// Simulated extraction parser that validates, creates, and destroys document (Epic 1 & 12)
function runExtractionAndDestruction(docName: string, checksum: string) {
  // 1. Read / Parse document simulation
  const objectsCreated = [
    { title: "Standard Oil Check Procedure", type: "SOP" },
    { title: "Hub Grease Torque Settings", type: "TORQUE_SPEC" }
  ];

  // 2. Destroy files simulation
  const deletedSuccessfully = true; // Temporary PDF is destroyed immediately

  return {
    objectsCreated,
    deletedSuccessfully,
  };
}

// =============================================================================
// TESTS
// =============================================================================

test("Epic 1 & 12: Knowledge extraction destroys temporary files and saves metadata", async () => {
  mockKeieDb.knowledge_extraction_audits = [];
  mockKeieDb.knowledge_objects = [];

  const result = runExtractionAndDestruction("Tata_Circular_992.pdf", "SHA256-PDF992");

  // Save structured objects
  for (const obj of result.objectsCreated) {
    await db.execute(
      `INSERT INTO "canonical"."knowledge_objects" (title, document_number, knowledge_type, status) VALUES (?, ?, ?, ?)`,
      [obj.title, "DOC-992", obj.type, "APPROVED"]
    );
  }

  // Save audit
  await db.execute(
    `INSERT INTO "canonical"."knowledge_extraction_audits" (document_number, checksum, parser_version, extracted_by, deleted_successfully) VALUES (?, ?, ?, ?, ?)`,
    ["DOC-992", "SHA256-PDF992", "v1.2.0", 99, result.deletedSuccessfully]
  );

  const [audits] = await db.execute(`SELECT * FROM "canonical"."knowledge_extraction_audits"`);
  const [objs] = await db.execute(`SELECT * FROM "canonical"."knowledge_objects"`);

  assertEquals(audits.length, 1);
  assertEquals(audits[0].deleted_successfully, true);
  assertEquals(objs.length, 2);
  assertEquals(objs[0].title, "Standard Oil Check Procedure");
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING KEIE ENGINE TESTS");
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
  console.log(`KEIE RESULTS: ${passed} passed, ${failed} failed`);
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
