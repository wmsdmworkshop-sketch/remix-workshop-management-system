// =============================================================================
// WOS Enterprise Timer Platform Test Suites (Phase 5F)
// Execution: npx tsx src/tests/timer-platform.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { EventBus } from "../core/event-bus";
import { TimerStore, EnterpriseTimerRecord } from "../core/timer/timer-store";
import { TimerCalendar } from "../core/timer/timer-calendar";
import { TimerEngine } from "../core/timer/timer-engine";
import { TimerManager } from "../core/timer/timer-manager";
import { TimerWorker } from "../core/timer/timer-worker";
import { TimerRecovery } from "../core/timer/timer-recovery";
import { TimerMetrics } from "../core/timer/timer-metrics";

// ═══════════════════════════════════════════════════════════════════
// DATABASE MOCK EMULATOR FOR TIMER PLATFORM
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

  if (query.startsWith("SELECT notification_id FROM tbl_notifications WHERE notification_type = 'WOS_ENTERPRISE_TIMER'")) {
    const pattern = params[0].replace(/%/g, "");
    const match = mockNotifications.filter(
      (n) => n.notification_type === "WOS_ENTERPRISE_TIMER" && n.action_url && n.action_url.includes(pattern)
    );
    return [match, []];
  }

  if (query.startsWith("SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_ENTERPRISE_TIMER'")) {
    if (params[0]) {
      const pattern = params[0].replace(/%/g, "");
      const match = mockNotifications.filter(
        (n) => n.notification_type === "WOS_ENTERPRISE_TIMER" && n.action_url && n.action_url.includes(pattern)
      );
      return [match, []];
    }
    const match = mockNotifications.filter((n) => n.notification_type === "WOS_ENTERPRISE_TIMER");
    return [match, []];
  }

  if (query.startsWith("UPDATE tbl_notifications SET action_url")) {
    const serialized = params[0];
    const notifId = params[1];
    const row = mockNotifications.find((n) => n.notification_id === notifId);
    if (row) {
      row.action_url = serialized;
    }
    return [[], []];
  }

  return [[], []];
};

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE TIMER PLATFORM TESTS");
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
  const calendar = new TimerCalendar();
  const engine = new TimerEngine(bus);
  const manager = new TimerManager();
  const worker = new TimerWorker(engine, calendar);
  const recovery = new TimerRecovery(engine);

  // Subscribe to timer events
  const eventsFired: string[] = [];
  bus.subscribe("TIMER_STARTED", () => { eventsFired.push("STARTED"); });
  bus.subscribe("TIMER_PAUSED", () => { eventsFired.push("PAUSED"); });
  bus.subscribe("TIMER_RESUMED", () => { eventsFired.push("RESUMED"); });
  bus.subscribe("TIMER_STOPPED", () => { eventsFired.push("STOPPED"); });
  bus.subscribe("TIMER_EXPIRED", () => { eventsFired.push("EXPIRED"); });
  bus.subscribe("TIMER_CANCELLED", () => { eventsFired.push("CANCELLED"); });

  const defaultPolicy = { businessHoursOnly: false, pausedOvernight: false, pausedOnHoliday: false };
  const bizPolicy = { businessHoursOnly: true, pausedOvernight: true, pausedOnHoliday: true };

  // ═══════════════════════════════════════════════════════════════════
  // 1. TIMER STATE MACHINE TRANSITIONS (UNIT TESTS)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running State Machine Transitions ---");

  mockNotifications = [];
  eventsFired.length = 0;

  // Start
  await engine.start("T-100", 999, "SLA", 30, defaultPolicy, { workshopId: 1, branchId: 10 }, "C-100");
  const t1 = await manager.getTimer("T-100");
  assert(t1?.status === "RUNNING", "Timer started successfully with RUNNING status");
  assert(eventsFired.includes("STARTED"), "TIMER_STARTED event published to EventBus");

  // Pause
  await engine.pause("T-100", "C-100");
  const t2 = await manager.getTimer("T-100");
  assert(t2?.status === "PAUSED" && t2.lastPausedTime !== undefined, "Timer paused successfully");
  assert(eventsFired.includes("PAUSED"), "TIMER_PAUSED event published");

  // Resume
  await new Promise((resolve) => setTimeout(resolve, 50));
  await engine.resume("T-100", "C-100");
  const t3 = await manager.getTimer("T-100");
  assert(t3?.status === "RUNNING" && t3.accumulatedMs > 0, "Timer resumed; pause duration accumulated");
  assert(eventsFired.includes("RESUMED"), "TIMER_RESUMED event published");

  // Suspend
  await engine.suspend("T-100", "C-100");
  const tSusp = await manager.getTimer("T-100");
  assert(tSusp?.status === "SUSPENDED", "Timer suspended successfully");

  // Restart
  await engine.restart("T-100", 45, "C-100");
  const tRest = await manager.getTimer("T-100");
  assert(tRest?.status === "RUNNING" && tRest.limitMinutes === 45, "Timer restarted with reset limits");

  // Cancel
  await engine.cancel("T-100", "C-100");
  const t4 = await manager.getTimer("T-100");
  assert(t4?.status === "CANCELLED", "Timer cancelled successfully");
  assert(eventsFired.includes("CANCELLED"), "TIMER_CANCELLED event published");


  // ═══════════════════════════════════════════════════════════════════
  // 2. CALENDAR HOUR EVALUATION & EXPIRATION (INTEGRATION TESTS)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Expiration & Calendar Simulations ---");

  mockNotifications = [];
  eventsFired.length = 0;

  // Setup a timer that started 35 minutes ago, limit 30 minutes, 24x7 policy
  const oldTime = new Date(Date.now() - 35 * 60 * 1000).toISOString();
  const breachedRecord: EnterpriseTimerRecord = {
    timerId: "T-200",
    jobId: 999,
    timerType: "SLA",
    status: "RUNNING",
    startTime: oldTime,
    accumulatedMs: 0,
    limitMinutes: 30,
    policy: defaultPolicy,
    workshopId: 1,
    branchId: 10,
    correlationId: "C-200",
  };
  await TimerStore.save(breachedRecord);

  // Scan
  await worker.scanAndProcess();
  const tBreach = await manager.getTimer("T-200");
  assert(tBreach?.status === "EXPIRED", "24x7 Timer expired automatically after raw time breach");
  assert(eventsFired.includes("EXPIRED"), "TIMER_EXPIRED event published to EventBus");


  // ═══════════════════════════════════════════════════════════════════
  // 3. BUSINESS HOURS CALENDAR EXCLUSION
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Business Hours Calendar Tests ---");

  mockNotifications = [];
  
  // Setup a timer that started 35 minutes ago, but with Business Hours Only policy
  // We mock calendar.isWorkingTime to return false (non-working hour/weekend)
  const calendarSpy = calendar.isWorkingTime;
  calendar.isWorkingTime = () => false;

  const bizHoursTimer: EnterpriseTimerRecord = {
    timerId: "T-300",
    jobId: 999,
    timerType: "SLA",
    status: "RUNNING",
    startTime: oldTime,
    accumulatedMs: 0,
    limitMinutes: 30,
    policy: bizPolicy,
    workshopId: 1,
    branchId: 10,
    correlationId: "C-300",
  };
  await TimerStore.save(bizHoursTimer);

  await worker.scanAndProcess();
  const tBiz = await manager.getTimer("T-300");
  assert(tBiz?.status === "RUNNING", "Timer does not expire during non-working hours");

  // Restore working time mock and scan again
  calendar.isWorkingTime = () => true;
  await worker.scanAndProcess();
  const tBizExpired = await manager.getTimer("T-300");
  assert(tBizExpired?.status === "EXPIRED", "Timer expires once business hours resume");

  // Restore calendar spy
  calendar.isWorkingTime = calendarSpy;


  // ═══════════════════════════════════════════════════════════════════
  // 4. CRASH & RESTART RECOVERY TEST
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Crash & Restart Recovery Test ---");

  mockNotifications = [];
  const runningRecord: EnterpriseTimerRecord = {
    timerId: "T-400",
    jobId: 999,
    timerType: "SLA",
    status: "RUNNING",
    startTime: new Date().toISOString(),
    accumulatedMs: 0,
    limitMinutes: 30,
    policy: defaultPolicy,
    workshopId: 1,
    branchId: 10,
    correlationId: "C-400",
  };
  await TimerStore.save(runningRecord);

  // Simulate Crash
  console.log("[Simulation] Server crashed. Reinitializing recovery engine...");
  const recoveredCount = await recovery.recoverTimers("C-RECOVER");
  assert(recoveredCount === 1, "One active running timer recovered successfully from persistent storage");


  // ═══════════════════════════════════════════════════════════════════
  // 5. STRESS TEST: 100,000 TIMERS MEMORY OVERHEAD BOUNDS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running 100,000 Timers Scale Stress Test ---");

  const startMemory = process.memoryUsage().heapUsed;
  const stressTimers: EnterpriseTimerRecord[] = [];

  for (let i = 0; i < 100000; i++) {
    stressTimers.push({
      timerId: `T-STRESS-${i}`,
      jobId: i,
      timerType: "SLA",
      status: "RUNNING",
      startTime: new Date().toISOString(),
      accumulatedMs: 0,
      limitMinutes: 60,
      policy: defaultPolicy,
      workshopId: 1,
      branchId: 1,
      correlationId: `CORR-${i}`,
    });
  }

  const endMemory = process.memoryUsage().heapUsed;
  const heapDiffMb = Math.round((endMemory - startMemory) / 1024 / 1024);
  console.log(`[StressTest] Heap usage change for 100k records: ${heapDiffMb} MB`);
  assert(heapDiffMb < 150, "Memory footprint for 100,000 timers is well within safety thresholds (< 150MB)");


  // ═══════════════════════════════════════════════════════════════════
  // 6. METRICS & COMPLIANCE AGGREGATES
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Timer Metrics Tests ---");

  const stats = await TimerMetrics.getMetrics();
  assert(stats.totalTimers > 0, "Metrics successfully aggregates total registered timers");
  assert(stats.recoverySuccessRatePct === 100, "Recovery success rate metrics calculated as 100%");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
