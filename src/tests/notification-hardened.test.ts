// =============================================================================
// WOS Notification Engine Hardening Tests (Phase 5D.2)
// Execution: npx tsx src/tests/notification-hardened.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { EventBus } from "../core/event-bus";
import { MockSmsProvider, MockEmailProvider } from "../core/notification-provider";
import { NotificationEngine } from "../core/notification-engine";
import { CircuitBreaker } from "../core/circuit-breaker";
import { NotificationQueue } from "../core/notification-queue";
import { OutboxService } from "../core/outbox-service";
import { HardenedEnvelope, WorkshopContext } from "../core/notification-metadata";

// ═══════════════════════════════════════════════════════════════════
// DATABASE MOCK EMULATOR FOR OUTBOX & TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════
let mockNotifications: any[] = [];
let nextNotifId = 1;

// Transaction tracking
let activeTransactionWrites: any[] = [];
let inTransaction = false;

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

    if (inTransaction) {
      activeTransactionWrites.push(row);
    } else {
      mockNotifications.push(row);
    }
    return [[{ insertId: row.notification_id }], []];
  }

  if (query.startsWith("SELECT COUNT(*)")) {
    const pattern = params[0].replace(/%/g, "");
    const match = mockNotifications.filter((n) => n.action_url && n.action_url.includes(pattern));
    return [[{ count: match.length }], []];
  }

  if (query.startsWith("SELECT notification_id, action_url FROM tbl_notifications")) {
    // Filter matching queue items
    const queuedMatch = mockNotifications.filter(
      (n) =>
        n.notification_type === "WOS_QUEUE_ITEM" &&
        n.action_url &&
        (n.action_url.includes('"status":"Queued"') || n.action_url.includes('"status":"Failed"'))
    );
    return [queuedMatch, []];
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

const mockConnection = {
  execute: async (sql: string, params: any[] = []): Promise<any> => {
    return db.execute(sql, params);
  },
  query: async (sql: string): Promise<any> => {
    const q = sql.trim();
    if (q === "START TRANSACTION") {
      inTransaction = true;
      activeTransactionWrites = [];
    } else if (q === "COMMIT") {
      mockNotifications.push(...activeTransactionWrites);
      activeTransactionWrites = [];
      inTransaction = false;
    } else if (q === "ROLLBACK") {
      activeTransactionWrites = [];
      inTransaction = false;
    }
    return [[], []];
  },
  release: () => {},
};

db.getConnection = async (): Promise<any> => {
  return mockConnection;
};

// Helper to create mock workshop contexts
const testContext: WorkshopContext = {
  workshopId: 1,
  branchId: 10,
  jobCardId: 999,
  vehicleId: 200,
  customerId: 300,
  serviceAdvisorId: 4,
  supervisorId: 5,
  technicianId: 6,
  bayId: 2,
  workflowState: "DIAGNOSTIC_WIP",
  queue: "DIAGNOSTIC_QUEUE",
  priority: "HIGH",
  generatedTime: new Date().toISOString(),
  expiryTime: new Date(Date.now() + 3600000).toISOString(),
  escalationLevel: 0,
};

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING HARDENED NOTIFICATION ENGINE PRODUCTION TESTS");
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
  const breaker = new CircuitBreaker(3, 50); // trip after 3 failures, 50ms cooldown
  const engine = new NotificationEngine(bus, breaker);

  const mockSms = new MockSmsProvider();
  const mockEmail = new MockEmailProvider();
  engine.registerProvider(mockSms);
  engine.registerProvider(mockEmail);

  const outbox = new OutboxService(engine, breaker);

  // ═══════════════════════════════════════════════════════════════════
  // 1. TRANSACTION ROLLBACK TEST
  // ═══════════════════════════════════════════════════════════════════
  mockNotifications = [];
  const envelope1: HardenedEnvelope = {
    notificationId: "N-101",
    correlationId: "C-100",
    validationRunId: "V-100",
    idempotencyKey: "IDEMP-100",
    status: "Queued",
    attempts: 0,
    maxAttempts: 3,
    context: testContext,
    recipient: "TECH_01",
    templateCode: "QC_FAILED",
    variables: { jobNo: "999", reason: "Scratches" },
    primaryChannel: "SMS",
  };

  // Start mock transaction and roll back
  const tx = await db.getConnection();
  await tx.query("START TRANSACTION");
  await outbox.stageNotification(envelope1, tx);
  
  // Verify it exists in transaction writes but not in main DB mock
  assert(activeTransactionWrites.length === 1, "Notification staged inside transaction writes");
  assert(mockNotifications.length === 0, "Notification not yet visible in main queue before commit");

  await tx.query("ROLLBACK");
  assert(mockNotifications.length === 0, "Staged notification discarded successfully on transaction ROLLBACK");


  // ═══════════════════════════════════════════════════════════════════
  // 2. TRANSACTION COMMIT & OUTBOX WORKER TEST
  // ═══════════════════════════════════════════════════════════════════
  mockNotifications = [];
  mockSms.sentLogs.length = 0;

  const txCommit = await db.getConnection();
  await txCommit.query("START TRANSACTION");
  await outbox.stageNotification(envelope1, txCommit);
  await txCommit.query("COMMIT");

  assert(mockNotifications.length === 1, "Staged notification committed to main DB queue");

  // Run outbox background worker
  await outbox.processOutbox();
  assert(mockSms.sentLogs.length === 1, "Outbox worker dispatched message via primary SMS provider");
  
  const processedJob = JSON.parse(mockNotifications[0].action_url) as HardenedEnvelope;
  assert(processedJob.status === "Delivered", "Notification status updated to Delivered post-dispatch");


  // ═══════════════════════════════════════════════════════════════════
  // 3. DUPLICATE PREVENTION (IDEMPOTENCY KEY)
  // ═══════════════════════════════════════════════════════════════════
  let duplicateBlocked = false;
  try {
    const txDup = await db.getConnection();
    await txDup.query("START TRANSACTION");
    // Attempting to stage same envelope1 (IDEMP-100) again
    await outbox.stageNotification(envelope1, txDup);
    await txDup.query("COMMIT");
  } catch (err: any) {
    duplicateBlocked = true;
    assert(err.message.includes("Duplicate notification idempotency block"), "Duplicate notification blocked");
  }
  assert(duplicateBlocked === true, "Idempotency validation prevents duplicate staging");


  // ═══════════════════════════════════════════════════════════════════
  // 4. PROVIDER TIMEOUT & DEAD LETTER ROUTING TEST
  // ═══════════════════════════════════════════════════════════════════
  mockNotifications = [];
  mockSms.shouldFail = true; // force SMS provider timeout/exception

  const envelopeFail: HardenedEnvelope = {
    notificationId: "N-102",
    correlationId: "C-200",
    validationRunId: "V-200",
    idempotencyKey: "IDEMP-200",
    status: "Queued",
    attempts: 0,
    maxAttempts: 3,
    context: testContext,
    recipient: "TECH_02",
    templateCode: "QC_FAILED",
    variables: { jobNo: "999", reason: "Scratches" },
    primaryChannel: "SMS", // will fail
  };

  const txFail = await db.getConnection();
  await txFail.query("START TRANSACTION");
  await outbox.stageNotification(envelopeFail, txFail);
  await txFail.query("COMMIT");

  // Run outbox worker 3 times to exhaust retries
  await outbox.processOutbox(); // Attempt 1 -> Failed status
  assert(mockNotifications[0].action_url.includes('"status":"Failed"'), "First failed attempt updates status to Failed");

  await outbox.processOutbox(); // Attempt 2 -> Failed status
  await outbox.processOutbox(); // Attempt 3 -> Exceeds max, moves to DeadLetter

  const dlqJob = JSON.parse(mockNotifications[0].action_url) as HardenedEnvelope;
  assert(dlqJob.status === "DeadLetter", "Notification status transitioned to DeadLetter after 3 failure attempts");
  
  // Verify DLQ log record was inserted in DB
  const dlqLogs = mockNotifications.filter((n) => n.notification_type === "DLQ_FAIL");
  assert(dlqLogs.length === 1, "Dead letter queue log row successfully persisted to database");


  // ═══════════════════════════════════════════════════════════════════
  // 5. CIRCUIT BREAKER TRIP & HALF-OPEN AUTO RECOVERY TEST
  // ═══════════════════════════════════════════════════════════════════
  // Since SMS provider experienced 3 failures in the previous test, the circuit breaker should be OPEN.
  assert(breaker.getState("SMS") === "OPEN", "Circuit breaker tripped to OPEN due to consecutive failures");

  mockNotifications = [];
  const envelopeCB: HardenedEnvelope = {
    notificationId: "N-103",
    correlationId: "C-300",
    validationRunId: "V-300",
    idempotencyKey: "IDEMP-300",
    status: "Queued",
    attempts: 0,
    maxAttempts: 3,
    context: testContext,
    recipient: "TECH_03",
    templateCode: "QC_FAILED",
    variables: { jobNo: "999", reason: "Scratches" },
    primaryChannel: "SMS",
  };

  const txCB = await db.getConnection();
  await txCB.query("START TRANSACTION");
  await outbox.stageNotification(envelopeCB, txCB);
  await txCB.query("COMMIT");

  // Process outbox while CB is open
  await outbox.processOutbox();
  
  const cbJob = JSON.parse(mockNotifications[0].action_url) as HardenedEnvelope;
  assert(cbJob.status === "DeadLetter", "Message failed fast and routed to DLQ immediately without calling provider");

  // Wait for CB cooldown to expire (50ms configured in test)
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert(breaker.getState("SMS") === "HALF_OPEN", "Circuit breaker transitioned to HALF_OPEN after cooldown expiry");

  // Reset SMS provider and attempt send again to close circuit
  mockSms.shouldFail = false;
  mockNotifications = [];
  
  const txRecovery = await db.getConnection();
  await txRecovery.query("START TRANSACTION");
  await outbox.stageNotification(envelopeCB, txRecovery);
  await txRecovery.query("COMMIT");

  await outbox.processOutbox();
  assert(breaker.getState("SMS") === "CLOSED", "Circuit breaker closed after successful dispatch in HALF_OPEN");


  // ═══════════════════════════════════════════════════════════════════
  // 6. CRASH & RESTART RECOVERY TEST
  // ═══════════════════════════════════════════════════════════════════
  mockNotifications = [];
  mockSms.sentLogs.length = 0;

  // Simulate staging two notifications before a crash
  const envelopeCrash1: HardenedEnvelope = {
    notificationId: "N-901",
    correlationId: "C-901",
    validationRunId: "V-901",
    idempotencyKey: "IDEMP-901",
    status: "Queued",
    attempts: 0,
    maxAttempts: 3,
    context: testContext,
    recipient: "USER_C1",
    templateCode: "QC_FAILED",
    variables: { jobNo: "999", reason: "Paint" },
    primaryChannel: "SMS",
  };

  const envelopeCrash2: HardenedEnvelope = {
    notificationId: "N-902",
    correlationId: "C-902",
    validationRunId: "V-902",
    idempotencyKey: "IDEMP-902",
    status: "Queued",
    attempts: 0,
    maxAttempts: 3,
    context: testContext,
    recipient: "USER_C2",
    templateCode: "QC_FAILED",
    variables: { jobNo: "999", reason: "Paint" },
    primaryChannel: "SMS",
  };

  const txCrash = await db.getConnection();
  await txCrash.query("START TRANSACTION");
  await outbox.stageNotification(envelopeCrash1, txCrash);
  await outbox.stageNotification(envelopeCrash2, txCrash);
  await txCrash.query("COMMIT");

  // Simulate Server Crash (Destroying in-memory classes, leaving DB intact)
  console.log("[Simulation] Server crash occurred. Simulating restart...");
  
  // Re-instantiate everything, pointing to same mock database
  const busRestart = new EventBus();
  const breakerRestart = new CircuitBreaker();
  const engineRestart = new NotificationEngine(busRestart, breakerRestart);
  const mockSmsRestart = new MockSmsProvider();
  engineRestart.registerProvider(mockSmsRestart);

  const outboxRestart = new OutboxService(engineRestart, breakerRestart);

  // Verify pending jobs are still present in DB queue
  const pendingJobs = await NotificationQueue.getPendingJobs();
  assert(pendingJobs.length === 2, "Pending notifications survived server crash in persistent DB store");

  // Process outbox and assert recovery dispatch
  await outboxRestart.processOutbox();
  assert(mockSmsRestart.sentLogs.length === 2, "Recovery worker processed outstanding messages successfully on restart");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
