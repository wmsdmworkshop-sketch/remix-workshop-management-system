/**
 * =============================================================================
 * DWIP Enterprise Platform — WP-06 SLA Engine Test Suite
 * Execution: npx tsx src/tests/sla-engine.test.ts
 * Description: Validates Tata Motors Commercial Vehicle TAT rules,
 *              3-level escalation matrix, and EventBus breach publishing.
 * =============================================================================
 */

import { SLAEngine, TATA_CV_TAT_BENCHMARKS } from "../engines/sla-engine.ts";
import { EventBus } from "../core/event-bus.ts";

async function runSLAEngineTests() {
  console.log("=============================================================================");
  console.log("STARTING DWIP HARDENED SLA ENGINE TEST SUITE (WP-06)");
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
    // 1. Tata Motors Commercial Vehicle TAT Benchmarks
    // -------------------------------------------------------------------------
    console.log("\n--- Category 1: Tata Motors CV TAT Benchmarks ---");
    assert(TATA_CV_TAT_BENCHMARKS["QS"] === 60, "Quick Service (QS) benchmark set to 60 minutes");
    assert(TATA_CV_TAT_BENCHMARKS["PM"] === 120, "Periodic Maintenance (PM) benchmark set to 120 minutes");
    assert(TATA_CV_TAT_BENCHMARKS["GR"] === 180, "General Repair (GR) benchmark set to 180 minutes");
    assert(TATA_CV_TAT_BENCHMARKS["EO"] === 480, "Engine Overhaul (EO) benchmark set to 480 minutes");
    assert(TATA_CV_TAT_BENCHMARKS["BREAKDOWN"] === 30, "QRT Breakdown Response benchmark set to 30 minutes");

    // -------------------------------------------------------------------------
    // 2. ETD Calculation
    // -------------------------------------------------------------------------
    console.log("\n--- Category 2: Target ETD Calculation ---");
    const now = new Date();
    const targetQS = SLAEngine.calculateTargetETD("QS", now);
    const expectedDiff = (targetQS.getTime() - now.getTime()) / (1000 * 60);

    assert(Math.round(expectedDiff) === 60, "calculateTargetETD accurately adds 60 minutes for QS");

    // -------------------------------------------------------------------------
    // 3. Escalation Matrix Evaluation
    // -------------------------------------------------------------------------
    console.log("\n--- Category 3: 3-Level Escalation Matrix Evaluation ---");
    
    // Test Level 0: On-Time
    const jobOnTime = {
      job_id: 1,
      job_card_no: "JC-001",
      vrn: "MH-12-TA-1001",
      sr_type_code: "GR",
      created_at: new Date().toISOString(),
      etd: new Date(Date.now() + 120 * 60 * 1000).toISOString()
    };
    const evalOnTime = SLAEngine.evaluateJobSLA(jobOnTime);
    assert(evalOnTime.status === "ON_TIME", "On-Time status resolved for jobs with ample ETD");
    assert(evalOnTime.escalationLevel === 0, "Escalation Level 0 assigned to On-Time jobs");

    // Test Level 1: Warning (remaining <= 30 mins)
    const jobL1 = {
      job_id: 2,
      job_card_no: "JC-002",
      vrn: "MH-12-TA-1002",
      sr_type_code: "GR",
      created_at: new Date(Date.now() - 155 * 60 * 1000).toISOString(),
      etd: new Date(Date.now() + 25 * 60 * 1000).toISOString()
    };
    const evalL1 = SLAEngine.evaluateJobSLA(jobL1);
    assert(evalL1.status === "WARNING_L1", "WARNING_L1 status resolved for remaining ETD <= 30m");
    assert(evalL1.escalationLevel === 1, "Escalation Level 1 assigned to Service Advisor");

    // Test Level 2: Warning (remaining <= 15 mins)
    const jobL2 = {
      job_id: 3,
      job_card_no: "JC-003",
      vrn: "MH-12-TA-1003",
      sr_type_code: "GR",
      created_at: new Date(Date.now() - 170 * 60 * 1000).toISOString(),
      etd: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    };
    const evalL2 = SLAEngine.evaluateJobSLA(jobL2);
    assert(evalL2.status === "WARNING_L2", "WARNING_L2 status resolved for remaining ETD <= 15m");
    assert(evalL2.escalationLevel === 2, "Escalation Level 2 assigned to Floor Supervisor");

    // Test Level 3: Breach (remaining <= 0 mins)
    const jobL3 = {
      job_id: 4,
      job_card_no: "JC-004",
      vrn: "MH-12-TA-1004",
      sr_type_code: "GR",
      created_at: new Date(Date.now() - 200 * 60 * 1000).toISOString(),
      etd: new Date(Date.now() - 20 * 60 * 1000).toISOString()
    };
    const evalL3 = SLAEngine.evaluateJobSLA(jobL3);
    assert(evalL3.status === "BREACHED_L3", "BREACHED_L3 status resolved for passed ETD");
    assert(evalL3.escalationLevel === 3, "Escalation Level 3 assigned to Workshop Manager & GM Service");
    assert(evalL3.isBreached === true, "isBreached set to true for Level 3 escalations");

    // -------------------------------------------------------------------------
    // 4. Batch Escalation Processing & EventBus Integration
    // -------------------------------------------------------------------------
    console.log("\n--- Category 4: Batch Processing & EventBus Publishing ---");
    const eventBus = new EventBus();
    let breachEventReceived: boolean = false;

    eventBus.subscribe("SLA_BREACHED", (evt) => {
      breachEventReceived = true;
    });

    const summary = await SLAEngine.processBatchEscalations([jobOnTime, jobL1, jobL2, jobL3], eventBus);

    assert(summary.totalEvaluated === 4, "Batch processing evaluated all 4 test job cards");
    assert(summary.onTimeCount === 1, "Accurately counted 1 On-Time job");
    assert(summary.breachedL3Count === 1, "Accurately counted 1 Level 3 Breached job");
    assert(Boolean(breachEventReceived), "EventBus received SLA_BREACHED published event");

  } catch (err: any) {
    console.error("FATAL ERROR in SLA Engine Test Suite:", err);
    failed++;
  } finally {
    console.log("\n=============================================================================");
    console.log(`SLA ENGINE TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log("=============================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runSLAEngineTests();
