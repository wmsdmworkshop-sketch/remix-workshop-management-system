// =============================================================================
// WOS Workshop Command Center (WCC) Unit Tests
// Execution: npx tsx src/tests/command-center.test.ts
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

// Simulated Bottleneck Engine (Epic 7)
function detectBottlenecks(activeJobs: any[], partsQueue: any[]) {
  const alerts: string[] = [];
  const recommendations: string[] = [];

  // Check if jobs are stuck waiting for parts
  const stuckOnParts = activeJobs.filter(j => j.status === "WAITING_PARTS");
  if (stuckOnParts.length > 2) {
    alerts.push("Parts backlog detected");
    recommendations.push("Prioritize processing of VOR orders in Parts Room");
  }

  // Check if QC has a backup
  const stuckOnQc = activeJobs.filter(j => j.status === "QC_PENDING");
  if (stuckOnQc.length > 3) {
    alerts.push("QC inspection bottleneck detected");
    recommendations.push("Assign Assistant Manager to execute helper road tests");
  }

  return { alerts, recommendations };
};

// Simulated Promise Management (Epic 6)
function calculateDeliveryConfidence(promisedTime: Date, expectedCompletionTime: Date) {
  const marginMs = promisedTime.getTime() - expectedCompletionTime.getTime();
  const marginMins = marginMs / (60 * 1000);

  if (marginMins < 0) {
    return { risk: "CRITICAL", confidence: 0, reason: "Expected completion exceeds promise time" };
  } else if (marginMins < 30) {
    return { risk: "WARNING", confidence: 50, reason: "Narrow margin under 30 minutes" };
  }
  return { risk: "LOW", confidence: 95, reason: "Adequate execution buffer" };
}

// =============================================================================
// TESTS
// =============================================================================

test("Epic 7: Bottleneck Engine alerts and recommends corrective actions", () => {
  const activeJobs = [
    { job_id: 101, status: "WAITING_PARTS" },
    { job_id: 102, status: "WAITING_PARTS" },
    { job_id: 103, status: "WAITING_PARTS" },
    { job_id: 104, status: "QC_PENDING" },
  ];
  const partsQueue: any[] = [];

  const results = detectBottlenecks(activeJobs, partsQueue);
  assertEquals(results.alerts.length, 1);
  assertEquals(results.alerts[0], "Parts backlog detected");
  assertEquals(results.recommendations[0], "Prioritize processing of VOR orders in Parts Room");
});

test("Epic 6: Promise Management calculates risks based on execution metrics", () => {
  const promise = new Date("2026-07-13T12:00:00Z");
  
  // Exceeds limit
  const expectedLate = new Date("2026-07-13T12:15:00Z");
  const r1 = calculateDeliveryConfidence(promise, expectedLate);
  assertEquals(r1.risk, "CRITICAL");
  assertEquals(r1.confidence, 0);

  // Safe buffer
  const expectedEarly = new Date("2026-07-13T10:30:00Z");
  const r2 = calculateDeliveryConfidence(promise, expectedEarly);
  assertEquals(r2.risk, "LOW");
  assertEquals(r2.confidence, 95);
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING COMMAND CENTER TESTS");
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
  console.log(`WCC RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
