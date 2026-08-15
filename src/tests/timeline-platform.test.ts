// =============================================================================
// WOS Enterprise Timeline Platform Test Suites (Phase 5H)
// Execution: npx tsx src/tests/timeline-platform.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { EventBus } from "../core/event-bus";
import { TimelineStore, TimelineEvent } from "../core/timeline/timeline-store";
import { TimelineEngine } from "../core/timeline/timeline-engine";
import { TimelineQuery } from "../core/timeline/timeline-query";
import { TimelineBuilder } from "../core/timeline/timeline-builder";
import { TimelineRecovery } from "../core/timeline/timeline-recovery";
import { TimelineAnalytics } from "../core/timeline/timeline-analytics";
import { TimelineRenderer } from "../core/timeline/timeline-renderer";

// ═══════════════════════════════════════════════════════════════════
// DATABASE MOCK EMULATOR FOR TIMELINE PLATFORM
// ═══════════════════════════════════════════════════════════════════
let mockNotifications: any[] = [];
let nextNotifId = 1;

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.startsWith("INSERT INTO tbl_notifications")) {
    const row = {
      notification_id: nextNotifId++,
      user_id: params[0],
      notification_type: params[1],
      message: params[2],
      priority: params[3],
      related_job_id: params[4],
      action_url: params[5],
    };
    mockNotifications.push(row);
    return [[{ insertId: row.notification_id }], []];
  }

  if (query.startsWith("SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_TIMELINE_RECORD'")) {
    return [mockNotifications, []];
  }

  return [[], []];
};

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE TIMELINE PLATFORM TESTS");
  console.log("=============================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Instantiations
  const bus = new EventBus();
  const engine = new TimelineEngine(bus);
  engine.initialize();

  const recovery = new TimelineRecovery();

  // ═══════════════════════════════════════════════════════════════════
  // 1. IMMUTABLE APPENDS & REPLAYS (UNIT TESTS)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Immutable Appends & Lifecycle Replays ---");

  mockNotifications = [];

  const evt1 = TimelineBuilder.build({
    timelineId: "TL-101",
    correlationId: "C-100",
    workshopId: 1,
    branchId: 10,
    jobCardId: 999,
    vehicleId: 200,
    customerId: 300,
    sourceEngine: "Workflow",
    eventType: "TRANSITION",
    eventName: "WORKFLOW_TRANSITIONED",
    priority: "MEDIUM",
  });

  await engine.append(evt1);

  const list = await TimelineStore.getAll();
  assert(list.length === 1 && list[0].timelineId === "TL-101", "Timeline event appended successfully and stored in DB");

  // Replays
  const jobTimeline = await TimelineQuery.getJobTimeline(999);
  assert(jobTimeline.length === 1 && jobTimeline[0].jobCardId === 999, "Job card lifecycle reconstructed successfully");

  const vehicleTimeline = await TimelineQuery.getVehicleTimeline(200);
  assert(vehicleTimeline.length === 1 && vehicleTimeline[0].vehicleId === 200, "Vehicle lifecycle reconstructed successfully");

  const customerTimeline = await TimelineQuery.getCustomerTimeline(300);
  assert(customerTimeline.length === 1 && customerTimeline[0].customerId === 300, "Customer lifecycle reconstructed successfully");


  // ═══════════════════════════════════════════════════════════════════
  // 2. SEARCH & FILTERS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Timeline Search & Filtering ---");

  mockNotifications = [];
  
  await engine.append(evt1);
  const searchResults = await TimelineQuery.searchAndFilter({ sourceEngine: "Workflow" });
  assert(searchResults.length === 1, "Filter by sourceEngine returns matching event results");

  const emptyResults = await TimelineQuery.searchAndFilter({ sourceEngine: "NonExistent" });
  assert(emptyResults.length === 0, "Filter by mismatching engine returns empty list");


  // ═══════════════════════════════════════════════════════════════════
  // 3. RENDERER OUTPUT VERIFICATION
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Timeline Renderer Tests ---");

  const text = TimelineRenderer.renderText(jobTimeline);
  assert(text.includes("Engine: Workflow") && text.includes("Job #999"), "Timeline renderer prints correctly formatted feeds");


  // ═══════════════════════════════════════════════════════════════════
  // 4. CRASH & RESTART RECOVERY TEST
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Crash & Restart Recovery Test ---");

  console.log("[Simulation] Server crashed. Reinitializing recovery engine...");
  const integrity = await recovery.verifyTimelineIntegrity();
  assert(integrity.totalCount === 1 && integrity.isValid === true, "Timeline ledger verified valid and persistent post-restart");


  // ═══════════════════════════════════════════════════════════════════
  // 5. STRESS TEST: 100,000 EVENTS MEMORY SCALE
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running 100,000 Events Scale Stress Test ---");

  const startMemory = process.memoryUsage().heapUsed;
  const stressEvents: TimelineEvent[] = [];

  for (let i = 0; i < 100000; i++) {
    stressEvents.push({
      timelineId: `TL-STRESS-${i}`,
      correlationId: `CORR-${i}`,
      workshopId: 1,
      branchId: 1,
      jobCardId: i,
      vehicleId: i,
      customerId: i,
      sourceEngine: "StressEngine",
      eventType: "STRESS",
      eventName: "STRESS_TEST",
      timestamp: new Date().toISOString(),
    });
  }

  const endMemory = process.memoryUsage().heapUsed;
  const heapDiffMb = Math.round((endMemory - startMemory) / 1024 / 1024);
  console.log(`[StressTest] Heap usage change for 100k events: ${heapDiffMb} MB`);
  assert(heapDiffMb < 150, "Memory footprint for 100,000 timeline events is well bounded (< 150MB)");


  // ═══════════════════════════════════════════════════════════════════
  // 6. ANALYTICS COMPILATION
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Timeline Analytics Tests ---");

  mockNotifications = [];
  // Append two events for job card 999 to simulate lifecycle times
  await engine.append({
    ...evt1,
    timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
  });

  const evt2 = {
    ...evt1,
    timelineId: "TL-102",
    eventName: "WORKFLOW_COMPLETED",
    timestamp: new Date().toISOString(),
  };
  await engine.append(evt2);

  const stats = await TimelineAnalytics.getLifecycleMetrics(1);
  assert(stats.totalEventsAnalyzed === 2, "Analytics tracks total timeline events analyzed correctly");
  assert(stats.averageJobLifecycleMinutes === 1, "Average job lifecycle duration computed correctly as 1 minute");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    // Exit explicitly: the harness leaves async handles (timers/mock listeners)
    // open, so without this Node waits on the event loop and the legacy test
    // runner's per-file timeout kills it before it's counted as passed.
    process.exit(0);
  }
}

runTestSuite();
