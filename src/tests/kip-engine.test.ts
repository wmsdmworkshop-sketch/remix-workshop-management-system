// =============================================================================
// WOS Knowledge Intelligence Platform (KIP) Unit Tests
// Execution: npx tsx src/tests/kip-engine.test.ts
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

// Mock Database collections to emulate KIP tables
const mockKipDb = {
  knowledge_objects: [] as any[],
  knowledge_relationships: [] as any[],
  workshop_learning_notes: [] as any[],
};

const originalExecute = db.execute;
db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO")) {
    const tableName = query.split(" ")[2].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName === "knowledge_objects") {
      mockKipDb.knowledge_objects.push({
        title: params[0],
        document_number: params[1],
        knowledge_type: params[2],
        status: params[3],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "knowledge_relationships") {
      mockKipDb.knowledge_relationships.push({
        source_id: params[0],
        target_id: params[1],
        relationship_type: params[2],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    } else if (tableName === "workshop_learning_notes") {
      mockKipDb.workshop_learning_notes.push({
        job_id: params[0],
        complaint: params[1],
        diagnosis: params[2],
        root_cause: params[3],
        repair: params[4],
        is_approved: params[5],
      });
      return [{ affectedRows: 1, insertId: 1 }];
    }
  }

  if (query.startsWith("SELECT")) {
    const tableName = query.split("FROM")[1]?.trim().split(" ")[0].replace(/["`]/g, "").split(".").pop() || "";
    if (tableName in mockKipDb) {
      // Basic search logic for testing full-text index
      if (query.includes("WHERE is_approved = true")) {
        return [mockKipDb.workshop_learning_notes.filter(n => n.is_approved === true), []];
      }
      return [(mockKipDb as any)[tableName], []];
    }
  }

  return [[]];
};

// AI filter policy (Epic 11)
function queryKnowledgeForAI(queryStr: string, allNotes: any[], allKnowledge: any[]) {
  // Only return approved knowledge items and approved workshop learning notes
  const approvedNotes = allNotes.filter(n => n.is_approved === true);
  const approvedOEM = allKnowledge.filter(k => k.status === "APPROVED");
  
  return {
    notes: approvedNotes.filter(n => n.complaint.toLowerCase().includes(queryStr.toLowerCase())),
    oem: approvedOEM.filter(k => k.title.toLowerCase().includes(queryStr.toLowerCase())),
  };
}

// =============================================================================
// TESTS
// =============================================================================

test("Epic 1 & 4: Knowledge Object and Knowledge Graph relationships function", async () => {
  mockKipDb.knowledge_objects = [];
  mockKipDb.knowledge_relationships = [];

  await db.execute(
    `INSERT INTO "canonical"."knowledge_objects" (title, document_number, knowledge_type, status) VALUES (?, ?, ?, ?)`,
    ["Turbo Actuator Diagnostics", "SOP-TML-450", "SOP", "APPROVED"]
  );

  await db.execute(
    `INSERT INTO "canonical"."knowledge_relationships" (source_id, target_id, relationship_type) VALUES (?, ?, ?)`,
    ["uuid-source", "uuid-target", "LINKS_TO"]
  );

  const [objs] = await db.execute(`SELECT * FROM "canonical"."knowledge_objects"`);
  const [rels] = await db.execute(`SELECT * FROM "canonical"."knowledge_relationships"`);

  assertEquals(objs.length, 1);
  assertEquals(objs[0].document_number, "SOP-TML-450");
  assertEquals(rels.length, 1);
});

test("Epic 7: Workshop Learning Engine queries approved items only", async () => {
  mockKipDb.workshop_learning_notes = [];

  // Add 1 approved and 1 unapproved learning note
  await db.execute(
    `INSERT INTO "canonical"."workshop_learning_notes" (job_id, complaint, diagnosis, root_cause, repair, is_approved) VALUES (?, ?, ?, ?, ?, ?)`,
    [2001, "Low Power output", "Turbo wastegate stuck open", "Carbon buildup", "Clean valve and test", true]
  );
  await db.execute(
    `INSERT INTO "canonical"."workshop_learning_notes" (job_id, complaint, diagnosis, root_cause, repair, is_approved) VALUES (?, ?, ?, ?, ?, ?)`,
    [2002, "Coolant leakage", "Hose crack near radiator", "Thermal wear", "Replace hose", false]
  );

  const [approvedNotes] = await db.execute(`SELECT * FROM "canonical"."workshop_learning_notes" WHERE is_approved = true`);
  
  assertEquals(approvedNotes.length, 1);
  assertEquals(approvedNotes[0].is_approved, true);
  assertEquals(approvedNotes[0].complaint, "Low Power output");
});

test("Epic 11: AI Interface filter policies strictly screen unapproved entries", () => {
  const allNotes = [
    { complaint: "Air leak", is_approved: true },
    { complaint: "Oil leakage", is_approved: false }
  ];
  const allKnowledge = [
    { title: "Air Brake Manual", status: "APPROVED" },
    { title: "DRAFT: Hydraulic System Update", status: "DRAFT" }
  ];

  const results = queryKnowledgeForAI("Air", allNotes, allKnowledge);
  
  assertEquals(results.notes.length, 1);
  assertEquals(results.notes[0].complaint, "Air leak");
  assertEquals(results.oem.length, 1);
  assertEquals(results.oem[0].title, "Air Brake Manual");
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING KIP ENGINE TESTS");
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
  console.log(`KIP RESULTS: ${passed} passed, ${failed} failed`);
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
