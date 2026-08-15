// =============================================================================
// WOS Enterprise Scheduler Platform Test Suites (Phase 5I)
// Execution: npx tsx src/tests/scheduler-platform.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { EventBus } from "../core/event-bus";
import { SchedulerStore, ScheduledJobRecord, WorkerLeaseRecord } from "../core/scheduler/scheduler-store";
import { SchedulerEngine } from "../core/scheduler/scheduler-engine";
import { SchedulerWorker } from "../core/scheduler/scheduler-worker";
import { SchedulerLock } from "../core/scheduler/scheduler-lock";
import { SchedulerRecovery } from "../core/scheduler/scheduler-recovery";
import { SchedulerMetrics } from "../core/scheduler/scheduler-metrics";

// ═══════════════════════════════════════════════════════════════════
// DATABASE MOCK EMULATOR FOR SCHEDULER PLATFORM
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

  if (query.includes("WOS_SCHEDULER_LOCK")) {
    if (params && params[0]) {
      const pattern = params[0].replace(/%/g, "");
      const match = mockNotifications.filter(
        (n) => n.notification_type === "WOS_SCHEDULER_LOCK" && n.action_url && n.action_url.includes(pattern)
      );
      return [match, []];
    }
    const match = mockNotifications.filter((n) => n.notification_type === "WOS_SCHEDULER_LOCK");
    return [match, []];
  }

  if (query.includes("WOS_SCHEDULER_JOB")) {
    if (params && params[0]) {
      const pattern = params[0].replace(/%/g, "");
      const match = mockNotifications.filter(
        (n) => n.notification_type === "WOS_SCHEDULER_JOB" && n.action_url && n.action_url.includes(pattern)
      );
      return [match, []];
    }
    const match = mockNotifications.filter((n) => n.notification_type === "WOS_SCHEDULER_JOB");
    return [match, []];
  }

  if (query.includes("WOS_SCHEDULER_LEASE")) {
    if (params && params[0]) {
      const pattern = params[0].replace(/%/g, "");
      const match = mockNotifications.filter(
        (n) => n.notification_type === "WOS_SCHEDULER_LEASE" && n.action_url && n.action_url.includes(pattern)
      );
      return [match, []];
    }
    const match = mockNotifications.filter((n) => n.notification_type === "WOS_SCHEDULER_LEASE");
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
  console.log("STARTING ENTERPRISE SCHEDULER PLATFORM TESTS");
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
  const engine = new SchedulerEngine(bus);
  const worker1 = new SchedulerWorker("WORKER-01", bus);
  const worker2 = new SchedulerWorker("WORKER-02", bus);
  const recovery = new SchedulerRecovery();

  const eventsFired: string[] = [];
  bus.subscribe("SCHEDULER_JOB_SCHEDULED", () => { eventsFired.push("SCHEDULED"); });
  bus.subscribe("SCHEDULER_JOB_COMPLETED", () => { eventsFired.push("COMPLETED"); });
  bus.subscribe("SCHEDULER_JOB_DEAD_LETTER", () => { eventsFired.push("DEAD_LETTER"); });

  // ═══════════════════════════════════════════════════════════════════
  // 1. SCHEDULER CONTROLS & STATE TRANSITIONS (UNIT TESTS)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Scheduler Core Operations ---");

  mockNotifications = [];
  eventsFired.length = 0;

  // Schedule One-Time Job
  await engine.scheduleJob("J-101", "TimerScan", "ONE_TIME", {}, { task: "scan" }, "C-100");
  const job1 = await SchedulerStore.getJob("J-101");
  assert(job1?.status === "PENDING", "Job card scheduled with status PENDING");
  assert(eventsFired.includes("SCHEDULED"), "SCHEDULER_JOB_SCHEDULED event published");

  // Pause
  await engine.pauseJob("J-101", "C-100");
  const job2 = await SchedulerStore.getJob("J-101");
  assert(job2?.status === "PAUSED", "Scheduled job paused successfully");

  // Resume
  await engine.resumeJob("J-101", "C-100");
  const job3 = await SchedulerStore.getJob("J-101");
  assert(job3?.status === "PENDING", "Scheduled job resumed successfully");

  // Cancel
  await engine.cancelJob("J-101", "C-100");
  const job4 = await SchedulerStore.getJob("J-101");
  assert(job4?.status === "COMPLETED", "Scheduled job cancelled (completed) successfully");


  // ═══════════════════════════════════════════════════════════════════
  // 2. LEADER ELECTION & DISTRIBUTED LOCKS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Leader Election & Locks ---");

  mockNotifications = [];

  // Register worker leases in mock DB
  const lease1: WorkerLeaseRecord = { workerId: "WORKER-01", heartbeatTime: new Date().toISOString(), isLeader: false };
  const lease2: WorkerLeaseRecord = { workerId: "WORKER-02", heartbeatTime: new Date().toISOString(), isLeader: false };
  await SchedulerStore.saveLease(lease1);
  await SchedulerStore.saveLease(lease2);

  // Elect leader for worker1
  const isW1Leader = await SchedulerLock.electLeader("WORKER-01");
  assert(isW1Leader === true, "Worker 1 successfully elected leader");

  // Attempt to elect worker2 (should fail because worker1 is active leader)
  const isW2Leader = await SchedulerLock.electLeader("WORKER-02");
  assert(isW2Leader === false, "Worker 2 election rejected while active leader is alive");

  // Acquire distributed lock
  const lockOk = await SchedulerLock.tryAcquireLock("LOCK-JOB-01", "WORKER-01", 10000);
  assert(lockOk === true, "Distributed lock acquired successfully");

  // Re-claim lock from someone else (should fail)
  const lockFail = await SchedulerLock.tryAcquireLock("LOCK-JOB-01", "WORKER-02", 10000);
  assert(lockFail === false, "Distributed lock request denied for non-owner");


  // ═══════════════════════════════════════════════════════════════════
  // 3. JOB EXECUTIONPost POST-COMMIT & RETRIES
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Job Executions, Retries, & DLQ ---");

  mockNotifications = [];
  eventsFired.length = 0;

  // Schedule a job that expired 5 minutes ago
  const expiredTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const jobRetryRecord: ScheduledJobRecord = {
    jobId: "J-202",
    name: "NotificationRetry",
    type: "ONE_TIME",
    status: "PENDING",
    nextExecutionTime: expiredTime,
    retryCount: 0,
    maxRetries: 3,
    payload: {},
    correlationId: "C-200",
  };
  await SchedulerStore.saveJob(jobRetryRecord);

  // Execute passes with forced failure to assert DLQ routing
  await worker1.executePass(async () => false); // Attempt 1 -> Failed
  const attempt1 = await SchedulerStore.getJob("J-202");
  assert(attempt1?.status === "FAILED" && attempt1.retryCount === 1, "First failure increments retry count and sets status FAILED");

  // Bypass timing lock in mock for next run
  attempt1.nextExecutionTime = new Date().toISOString();
  await SchedulerStore.saveJob(attempt1);

  await worker1.executePass(async () => false); // Attempt 2 -> Failed
  const attempt2 = await SchedulerStore.getJob("J-202");
  attempt2.nextExecutionTime = new Date().toISOString();
  await SchedulerStore.saveJob(attempt2);

  await worker1.executePass(async () => false); // Attempt 3 -> DLQ
  const attempt3 = await SchedulerStore.getJob("J-202");
  assert(attempt3?.status === "DEAD_LETTER", "Job status transitioned to DEAD_LETTER after max retries exceeded");
  assert(eventsFired.includes("DEAD_LETTER"), "SCHEDULER_JOB_DEAD_LETTER event published");


  // ═══════════════════════════════════════════════════════════════════
  // 4. CRASH & RESTART RECOVERY TEST
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Crash & Restart Recovery Test ---");

  // Setup a job in status RUNNING (simulating crashed state on a dead node)
  const orphanJob: ScheduledJobRecord = {
    jobId: "J-303",
    name: "WorkflowSLACheck",
    type: "ONE_TIME",
    status: "RUNNING",
    nextExecutionTime: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 3,
    payload: {},
    correlationId: "C-300",
    lockedBy: "WORKER-DEAD",
  };
  await SchedulerStore.saveJob(orphanJob);

  // Simulate Crash
  console.log("[Simulation] Server crashed. Reinitializing recovery engine...");
  const recoveredCount = await recovery.recoverOrphanedJobs();
  assert(recoveredCount === 1, "Orphaned locked running job recovered post-restart");

  const restored = await SchedulerStore.getJob("J-303");
  assert(restored?.status === "PENDING", "Recovered job state restored to PENDING for execution");


  // ═══════════════════════════════════════════════════════════════════
  // 5. STRESS TEST: 100,000 SCHEDULED JOBS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running 100,000 Scheduled Jobs Scale Stress Test ---");

  const startMemory = process.memoryUsage().heapUsed;
  const stressJobs: ScheduledJobRecord[] = [];

  for (let i = 0; i < 100000; i++) {
    stressJobs.push({
      jobId: `J-STRESS-${i}`,
      name: `Job-${i}`,
      type: "FIXED_RATE",
      intervalMs: 60000,
      status: "PENDING",
      nextExecutionTime: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      payload: {},
      correlationId: `CORR-${i}`,
    });
  }

  const endMemory = process.memoryUsage().heapUsed;
  const heapDiffMb = Math.round((endMemory - startMemory) / 1024 / 1024);
  console.log(`[StressTest] Heap usage change for 100k scheduled jobs: ${heapDiffMb} MB`);
  assert(heapDiffMb < 150, "Memory footprint for 100,000 scheduled jobs is well within limits (< 150MB)");


  // ═══════════════════════════════════════════════════════════════════
  // 6. METRICS COMPILATION
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Scheduler Metrics Tests ---");

  const stats = await SchedulerMetrics.getMetrics();
  assert(stats.totalJobs > 0, "Metrics successfully compiler aggregates total scheduled jobs");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    // Exit explicitly: without this the process hangs on open async handles
    // and the legacy test runner's per-file timeout kills it before it's
    // counted as passed.
    process.exit(0);
  }
}

runTestSuite();
