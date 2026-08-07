// =============================================================================
// WOS Executive Intelligence Platform (EIP) Unit Tests
// Execution: npx tsx src/tests/executive-intelligence.test.ts
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

// Simulated Forecast Engine (Epic 6)
function forecastMonthEndRevenue(currentDay: number, currentRevenue: number, totalDaysInMonth: number) {
  const dailyRunRate = currentRevenue / currentDay;
  const predictedTotal = dailyRunRate * totalDaysInMonth;
  const confidence = dailyRunRate > 50000 ? 90 : 70; // higher run-rate yields higher baseline confidence

  return {
    predictedTotal,
    dailyRunRate,
    confidence,
  };
}

// Simulated Root Cause Analytics (Epic 11)
function analyzeRevenueDrop(targetRevenue: number, actualRevenue: number, delaysList: { type: string; count: number }[]) {
  const gap = targetRevenue - actualRevenue;
  if (gap <= 0) return { dropped: false, mainCause: "N/A" };

  // Sort delays to find the primary bottleneck
  const primaryDelay = [...delaysList].sort((a, b) => b.count - a.count)[0];
  return {
    dropped: true,
    gap,
    mainCause: primaryDelay ? primaryDelay.type : "UNKNOWN",
  };
}

// =============================================================================
// TESTS
// =============================================================================

test("Epic 6: Forecast Engine calculates monthly revenue trends and confidence", () => {
  const currentDay = 15;
  const currentRevenue = 750000; // run-rate 50,000/day
  const totalDays = 30;

  const result = forecastMonthEndRevenue(currentDay, currentRevenue, totalDays);
  assertEquals(result.predictedTotal, 1500000);
  assertEquals(result.dailyRunRate, 50000);
  assertEquals(result.confidence, 70); // boundary check
});

test("Epic 11: Root Cause Analytics identifies the primary reason for revenue drop", () => {
  const target = 1000000;
  const actual = 850000; // gap of 150,000
  const delays = [
    { type: "PARTS_DELAY", count: 12 },
    { type: "WAITING_APPROVALS", count: 4 },
    { type: "BAY_UTILIZATION", count: 2 },
  ];

  const analysis = analyzeRevenueDrop(target, actual, delays);
  assertEquals(analysis.dropped, true);
  assertEquals(analysis.gap, 150000);
  assertEquals(analysis.mainCause, "PARTS_DELAY");
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING EXECUTIVE INTELLIGENCE TESTS");
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
  console.log(`EIP RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
