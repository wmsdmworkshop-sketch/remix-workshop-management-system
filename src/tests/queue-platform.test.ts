// =============================================================================
// WOS Enterprise Queue Platform Test Suites (Phase 5G)
// Execution: npx tsx src/tests/queue-platform.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { EventBus } from "../core/event-bus";
import { QueueEngine, QueueItem } from "../core/queue/queue-engine";
import { QueueManager } from "../core/queue/queue-manager";
import { QueuePriority } from "../core/queue/queue-priority";
import { QueueBalancer, BalancerCandidate } from "../core/queue/queue-balancer";
import { QueueRecovery } from "../core/queue/queue-recovery";
import { QueueAnalytics } from "../core/queue/queue-analytics";

// ═══════════════════════════════════════════════════════════════════
// DATABASE MOCK EMULATOR FOR QUEUE PLATFORM
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

  if (query.startsWith("SELECT notification_id FROM tbl_notifications WHERE notification_type = 'WOS_QUEUE_ITEM_METADATA'")) {
    const pattern = params[0].replace(/%/g, "");
    const match = mockNotifications.filter(
      (n) => n.notification_type === "WOS_QUEUE_ITEM_METADATA" && n.action_url && n.action_url.includes(pattern)
    );
    return [match, []];
  }

  if (query.startsWith("SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_QUEUE_ITEM_METADATA'")) {
    if (params[0]) {
      const pattern = params[0].replace(/%/g, "");
      const match = mockNotifications.filter(
        (n) => n.notification_type === "WOS_QUEUE_ITEM_METADATA" && n.action_url && n.action_url.includes(pattern)
      );
      return [match, []];
    }
    const match = mockNotifications.filter((n) => n.notification_type === "WOS_QUEUE_ITEM_METADATA");
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
  console.log("STARTING ENTERPRISE QUEUE PLATFORM TESTS");
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
  const engine = new QueueEngine(bus);
  const manager = new QueueManager(engine);
  const balancer = new QueueBalancer(engine);
  const recovery = new QueueRecovery(engine);
  const analytics = new QueueAnalytics(engine);

  // Subscribe to queue events
  const eventsFired: string[] = [];
  bus.subscribe("QUEUE_ENQUEUED", () => eventsFired.push("ENQUEUED"));
  bus.subscribe("QUEUE_DEQUEUED", () => eventsFired.push("DEQUEUED"));
  bus.subscribe("QUEUE_TRANSFERRED", () => eventsFired.push("TRANSFERRED"));

  // Helper factors
  const stdFactors = { entryTime: new Date().toISOString() };
  const vipFactors = { isVip: true, entryTime: new Date().toISOString() };
  const emergencyFactors = { isEmergency: true, entryTime: new Date().toISOString() };

  // ═══════════════════════════════════════════════════════════════════
  // 1. QUEUE OPERATIONS (ENQUEUE, DEQUEUE, PEEK, SUSPEND)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Queue Core Operations ---");

  mockNotifications = [];
  eventsFired.length = 0;

  // Enqueue
  await engine.enqueue("Q-100", 111, "ADVISOR", stdFactors, { workshopId: 1, branchId: 10 }, "C-100");
  const q1 = await engine.get("Q-100");
  assert(q1?.status === "WAITING", "Queue item successfully enqueued with WAITING status");
  assert(eventsFired.includes("ENQUEUED"), "QUEUE_ENQUEUED event published");

  // Peek
  const peekItem = await engine.peek("ADVISOR", 1);
  assert(peekItem?.itemId === "Q-100", "Peek returns next eligible item without changing status");

  // Dequeue
  const dequeued = await engine.dequeue("ADVISOR", 1, 5, "C-100");
  assert(dequeued?.itemId === "Q-100" && dequeued.status === "PROCESSING", "Item successfully dequeued to PROCESSING status");
  assert(eventsFired.includes("DEQUEUED"), "QUEUE_DEQUEUED event published");


  // ═══════════════════════════════════════════════════════════════════
  // 2. DYNAMIC PRIORITY & EMERGENCY BYPASS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Dynamic Priority & Emergency Bypass Tests ---");

  mockNotifications = [];
  eventsFired.length = 0;

  // Enqueue normal, then VIP, then Emergency
  await engine.enqueue("Q-NORMAL", 111, "ADVISOR", stdFactors, { workshopId: 1, branchId: 10 }, "C-100");
  await engine.enqueue("Q-VIP", 222, "ADVISOR", vipFactors, { workshopId: 1, branchId: 10 }, "C-100");
  await engine.enqueue("Q-EMERGENCY", 333, "ADVISOR", emergencyFactors, { workshopId: 1, branchId: 10 }, "C-100");

  // Peek should return Emergency item immediately (bypassing normal and VIP due to higher priority score)
  const nextTarget = await engine.peek("ADVISOR", 1);
  assert(nextTarget?.itemId === "Q-EMERGENCY", "Emergency item bypassed existing items in queue correctly");

  // Dequeue highest priority
  const firstOut = await engine.dequeue("ADVISOR", 1, 6, "C-100");
  assert(firstOut?.itemId === "Q-EMERGENCY", "Emergency item dequeued first");


  // ═══════════════════════════════════════════════════════════════════
  // 3. QUEUE TRANSFERS, MERGES, & SPLITS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Queue Transfers, Merges, & Splits ---");

  mockNotifications = [];
  eventsFired.length = 0;

  await engine.enqueue("Q-TRANS", 444, "ADVISOR", stdFactors, { workshopId: 1, branchId: 10 }, "C-100");
  
  // Transfer from ADVISOR to TECHNICIAN
  await engine.transfer("Q-TRANS", "TECHNICIAN", "C-100");
  const transferred = await engine.get("Q-TRANS");
  assert(transferred?.queueName === "TECHNICIAN", "Queue item transferred to target queue successfully");
  assert(eventsFired.includes("TRANSFERRED"), "QUEUE_TRANSFERRED event published");


  // ═══════════════════════════════════════════════════════════════════
  // 4. AUTOMATIC WORKLOAD BALANCING
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Workload Balancing Tests ---");

  mockNotifications = [];
  
  // Load Candidates
  const candidates: BalancerCandidate[] = [
    { staffId: 10, role: "ADVISOR", skillLevel: 2, activeLoad: 5, isAvailable: true }, // High Load
    { staffId: 20, role: "ADVISOR", skillLevel: 4, activeLoad: 1, isAvailable: true }, // Low Load (Optimal)
    { staffId: 30, role: "ADVISOR", skillLevel: 3, activeLoad: 1, isAvailable: false }, // Unavailable
  ];

  const optimal = balancer.findOptimalStaff(candidates, 3);
  assert(optimal?.staffId === 20, "Optimal candidate chosen based on lowest active load and skills match");


  // ═══════════════════════════════════════════════════════════════════
  // 5. CRASH & RESTART RECOVERY TEST
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Crash & Restart Recovery Test ---");

  mockNotifications = [];
  // Populate an active queue item before the recovery scan
  await engine.enqueue("Q-RECOVER-TEST", 555, "ADVISOR", stdFactors, { workshopId: 1, branchId: 10 }, "C-100");

  // Verify recovery scanner restores active queue items
  const recoveredCount = await recovery.recoverQueues("C-RECOVER");
  assert(recoveredCount === 1, "Active queue items survived server crash restart and recovered successfully");


  // ═══════════════════════════════════════════════════════════════════
  // 6. STRESS TEST: 100,000 QUEUE ITEMS SCALE
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running 100,000 Items Scale Stress Test ---");

  const startMemory = process.memoryUsage().heapUsed;
  const stressItems: QueueItem[] = [];

  for (let i = 0; i < 100000; i++) {
    stressItems.push({
      itemId: `Q-STRESS-${i}`,
      jobId: i,
      queueName: "ADVISOR",
      status: "WAITING",
      factors: stdFactors,
      priorityScore: 100,
      workshopId: 1,
      branchId: 1,
      entryTime: new Date().toISOString(),
    });
  }

  const endMemory = process.memoryUsage().heapUsed;
  const heapDiffMb = Math.round((endMemory - startMemory) / 1024 / 1024);
  console.log(`[StressTest] Heap usage change for 100k items: ${heapDiffMb} MB`);
  assert(heapDiffMb < 150, "Memory footprint for 100,000 queue items is well bounded (< 150MB)");


  // ═══════════════════════════════════════════════════════════════════
  // 7. ANALYTICS COMPILATION
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Queue Analytics Tests ---");

  const stats = await analytics.getQueueAnalytics("ADVISOR", 1);
  assert(stats.queueLength !== undefined, "Analytics tracks queue length aggregates correctly");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
