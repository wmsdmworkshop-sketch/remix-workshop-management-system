/**
 * =============================================================================
 * DWIP Enterprise Platform — WP-09 Executive MIS & Analytics Test Suite
 * Execution: npx tsx src/tests/executive-mis.test.ts
 * Description: Validates commercial dealership KPI calculations, PowerBI JSON
 *              dataset formatting, and daily KPI snapshot generation.
 * =============================================================================
 */

import { ExecutiveMISEngine } from "../engines/executive-mis-engine.ts";

async function runExecutiveMISTests() {
  console.log("=============================================================================");
  console.log("STARTING DWIP EXECUTIVE MIS & ANALYTICS TEST SUITE (WP-09)");
  console.log("=============================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. KPI Calculation Verification
    // -------------------------------------------------------------------------
    console.log("\n--- Category 1: Workshop KPI Calculation Engine ---");
    const mockJobs = [
      { job_id: 1, status: "Active" },
      { job_id: 2, status: "Active" },
      { job_id: 3, status: "Completed" },
      { job_id: 4, status: "Invoiced" }
    ];
    const mockInvoices = [
      { invoice_id: 101, total_amount: 45000 },
      { invoice_id: 102, total_amount: 35000 }
    ];
    const mockBays = [
      { bay_id: 1, status: "Occupied" },
      { bay_id: 2, status: "Occupied" },
      { bay_id: 3, status: "Occupied" },
      { bay_id: 4, status: "Available" }
    ];

    const kpis = ExecutiveMISEngine.calculateWorkshopKPIs(mockJobs, mockInvoices, mockBays);

    assert(kpis.activeJobCardsCount === 2, "Accurately counted active job cards");
    assert(kpis.completedTodayCount === 2, "Accurately counted completed/invoiced job cards");
    assert(kpis.occupiedBays === 3, "Accurately counted occupied service bays");
    assert(kpis.bayUtilizationPct === 75.0, "Accurately calculated Bay Utilization Percentage (75%)");
    assert(kpis.totalRevenueToday === 80000, "Accurately aggregated total daily invoice revenue (₹80,000)");

    // -------------------------------------------------------------------------
    // 2. PowerBI Export Dataset Generation
    // -------------------------------------------------------------------------
    console.log("\n--- Category 2: PowerBI Export Dataset Formatting ---");
    const powerBiPayload = ExecutiveMISEngine.generatePowerBIExportPayload(kpis);

    assert(powerBiPayload.datasetName === "DWIP_Executive_MIS_Daily_Summary", "PowerBI datasetName formatted correctly");
    assert(powerBiPayload.enterpriseName === "Devanand Automobiles (Motors) LLP", "Enterprise attribution verified");
    assert(powerBiPayload.metrics.length === 6, "Contains all 6 core commercial dealership metrics");

    const bayMetric = powerBiPayload.metrics.find(m => m.name === "Bay Utilization");
    assert(bayMetric !== undefined && bayMetric.value === 75.0, "PowerBI Bay Utilization metric payload matches KPI calculations");

    // -------------------------------------------------------------------------
    // 3. Daily KPI Snapshot Execution
    // -------------------------------------------------------------------------
    console.log("\n--- Category 3: Daily KPI Snapshot Generator ---");
    const snapshot = await ExecutiveMISEngine.generateDailyKPISnapshot();
    assert(snapshot !== null && snapshot.timestamp !== undefined, "Daily KPI snapshot generated with valid ISO timestamp");

  } catch (err: any) {
    console.error("FATAL ERROR in Executive MIS Test Suite:", err);
    failed++;
  } finally {
    console.log("\n=============================================================================");
    console.log(`EXECUTIVE MIS TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log("=============================================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runExecutiveMISTests();
