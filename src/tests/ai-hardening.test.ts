// =============================================================================
// DWIP AI Hardening Platform Unit Tests
// Execution: npx tsx src/tests/ai-hardening.test.ts
// =============================================================================

import { pool as db } from "../db/index.ts";
import { AiCopilotOrchestrator } from "../engines/ai-copilot-orchestrator.ts";
import { EkgEngine } from "../engines/ekg-engine.ts";
import { globalEventBus } from "../core/event-bus.ts";
import { initializeEkgEventListeners } from "../core/ekg-event-listener.ts";

const tests: { name: string; fn: () => Promise<void> | void }[] = [];
function test(name: string, fn: () => Promise<void> | void) {
  tests.push({ name, fn });
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}: expected ${expected}, got ${actual}`);
  }
}

async function setupHardeningTestDb() {
  await db.execute("DELETE FROM graph_edges");
  await db.execute("DELETE FROM graph_nodes");
  await db.execute("DELETE FROM ai_recommendations");
  await db.execute("DELETE FROM ai_copilot_skills");
}

// =============================================================================
// TESTS
// =============================================================================

test("AI Skill Marketplace: routes dynamically and checks roles", async () => {
  await setupHardeningTestDb();

  // Route to Warranty Skill
  const warrantyRes = await AiCopilotOrchestrator.dispatch("Check warranty claims eligibility", "Service Advisor", {});
  assertEquals(warrantyRes.status, "PENDING_APPROVAL");
  assertEquals(warrantyRes.recommendationType, "WARRANTY");

  // Route to Finance Skill (restricted to Dealer Principal / GM Service)
  try {
    await AiCopilotOrchestrator.dispatch("Evaluate goodwill discount", "Service Advisor", {});
    throw new Error("Should have thrown access denied error");
  } catch (err: any) {
    assertEquals(err.message.includes("Access denied"), true);
  }

  // Allowed role should succeed
  const financeRes = await AiCopilotOrchestrator.dispatch("Evaluate goodwill discount", "Dealer Principal", {});
  assertEquals(financeRes.status, "PENDING_APPROVAL");
  assertEquals(financeRes.recommendationType, "FINANCE");
});

test("Human Approval Workflow: recommendations require sign-off", async () => {
  await setupHardeningTestDb();

  const res = await AiCopilotOrchestrator.dispatch("Check warranty claims eligibility", "Service Advisor", { claimNo: "CLM-88", vin: "VIN-MH12-99" });
  const recId = res.recommendationId;

  // Assert pending in DB
  const [rows] = await db.query("SELECT * FROM ai_recommendations WHERE recommendation_id = ?", [recId]) as any[];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].approval_status, "PENDING");
  assertEquals(rows[0].requires_approval, 1);
});

test("Learning Feedback Loop: Approved recommendations reinforce EKG", async () => {
  await setupHardeningTestDb();
  initializeEkgEventListeners();

  const res = await AiCopilotOrchestrator.dispatch("Check warranty claims eligibility", "Service Advisor", { claimNo: "CLM-88", vin: "VIN-MH12-99" });
  const recId = res.recommendationId;

  // Manually invoke approval workflow by publishing event directly (simulating REST handler call)
  await db.execute("UPDATE ai_recommendations SET approval_status = 'APPROVED' WHERE recommendation_id = ?", [recId]);
  await globalEventBus.publish("RECOMMENDATION_APPROVED", {
    recommendation_id: recId,
    recommendation_type: "WARRANTY",
    details: { claimNo: "CLM-88", vin: "VIN-MH12-99" }
  }, "TEST-RUNNER");

  // Allow event bus execution time
  await new Promise(resolve => setTimeout(resolve, 100));

  // Assert EKG Node and STRENGTHENS edge exist
  const [edges] = await db.query(
    "SELECT * FROM graph_edges WHERE source_node_id = ? AND relationship_type = 'STRENGTHENS'",
    [recId]
  ) as any[];
  assertEquals(edges.length, 1);
  assertEquals(edges[0].target_node_id, "VIN-MH12-99");
});

test("Learning Feedback Loop: Rejected recommendations create learning cases", async () => {
  await setupHardeningTestDb();
  initializeEkgEventListeners();

  const res = await AiCopilotOrchestrator.dispatch("Evaluate goodwill discount", "Dealer Principal", { customerId: "CUST-9011" });
  const recId = res.recommendationId;

  // Manually invoke rejection workflow
  await db.execute("UPDATE ai_recommendations SET approval_status = 'REJECTED' WHERE recommendation_id = ?", [recId]);
  await globalEventBus.publish("RECOMMENDATION_REJECTED", {
    recommendation_id: recId,
    recommendation_type: "FINANCE",
    details: { customerId: "CUST-9011" }
  }, "TEST-RUNNER");

  // Allow event bus execution time
  await new Promise(resolve => setTimeout(resolve, 100));

  // Assert EKG Node and REJECTED_CASE edge exist
  const [edges] = await db.query(
    "SELECT * FROM graph_edges WHERE source_node_id = ? AND relationship_type = 'REJECTED_CASE'",
    [recId]
  ) as any[];
  assertEquals(edges.length, 1);
  assertEquals(edges[0].target_node_id, "CUST-9011");
});

test("AI Performance Analytics: aggregates mathematical counts and ratings", async () => {
  await setupHardeningTestDb();

  // Create mock recommendations with ratings and statuses
  await db.execute(
    `INSERT INTO ai_recommendations (recommendation_id, recommendation_type, details_json, confidence_score, requires_approval, approval_status, feedback_rating, role_submitting, time_saved_sec)
     VALUES 
     ('REC-1', 'WARRANTY', '{}', 0.95, 1, 'APPROVED', 5, 'Service Advisor', 180),
     ('REC-2', 'FINANCE', '{}', 0.90, 1, 'APPROVED', 4, 'Service Advisor', 120),
     ('REC-3', 'INVENTORY', '{}', 0.85, 1, 'REJECTED', 2, 'Workshop Manager', 0)`
  );

  // Assert counts via DB query
  const [totalRow] = await db.query("SELECT COUNT(*) as count FROM ai_recommendations") as any[];
  const [approvedRow] = await db.query("SELECT COUNT(*) as count FROM ai_recommendations WHERE approval_status = 'APPROVED'") as any[];
  const [rejectedRow] = await db.query("SELECT COUNT(*) as count FROM ai_recommendations WHERE approval_status = 'REJECTED'") as any[];

  assertEquals(totalRow[0].count, 3);
  assertEquals(approvedRow[0].count, 2);
  assertEquals(rejectedRow[0].count, 1);

  const [avgConfRow] = await db.query("SELECT AVG(confidence_score) as avgConf FROM ai_recommendations") as any[];
  assertEquals(Number(Number(avgConfRow[0].avgConf).toFixed(2)), 0.90);
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING AI HARDENING PLATFORM UNIT TESTS");
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
      console.error(err.stack || err.message);
      failed++;
    }
  }

  // Cleanup test data
  try {
    await setupHardeningTestDb();
  } catch (e) {}

  console.log("=============================================================================");
  console.log(`AI HARDENING PLATFORM TESTS RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  try {
    await db.end();
  } catch (e) {}

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(async (err) => {
  console.error(err);
  try {
    await db.end();
  } catch (e) {}
  process.exit(1);
});
