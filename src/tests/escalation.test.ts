// =============================================================================
// WOS Escalation Engine Test Suites (Phase 5E)
// Execution: npx tsx src/tests/escalation.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { EventBus } from "../core/event-bus";
import { NotificationEngine } from "../core/notification-engine";
import { EscalationPolicy } from "../core/escalation/escalation-policy";
import { EscalationTimer, TimerRecord } from "../core/escalation/escalation-timer";
import { EscalationHistory } from "../core/escalation/escalation-history";
import { EscalationAnalytics } from "../core/escalation/escalation-analytics";
import { EscalationEngine } from "../core/escalation/escalation-engine";
import { MockSmsProvider } from "../core/notification-provider";

// ═══════════════════════════════════════════════════════════════════
// DATABASE MOCK EMULATOR FOR ESCALATION PERSISTENCE
// ═══════════════════════════════════════════════════════════════════
let mockNotifications: any[] = [];
let mockAuditLogs: any[] = [];
let mockJobCards: any[] = [];
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

  if (query.startsWith("INSERT INTO tbl_audit_trail")) {
    mockAuditLogs.push({
      entity_type: params[0],
      entity_id: params[1],
      action_code: params[2],
      payload_diff: params[3],
      user_id: params[4],
    });
    return [[{ insertId: Date.now() }], []];
  }

  if (query.startsWith("SELECT COUNT(*)")) {
    if (!params || params.length === 0) {
      // e.g. SELECT COUNT(*) as total FROM job_cards
      return [[{ total: mockJobCards.length }], []];
    }
    const pattern = params[0].replace(/%/g, "");
    const match = mockNotifications.filter(
      (n) =>
        n.action_url &&
        n.action_url.includes(pattern) &&
        (!n.notification_type || n.notification_type.includes("HISTORY") || n.notification_type.includes("TIMER"))
    );
    return [[{ count: match.length }], []];
  }

  if (query.startsWith("SELECT notification_id FROM tbl_notifications WHERE notification_type = 'WOS_TIMER'")) {
    const pattern = params[0].replace(/%/g, "");
    const match = mockNotifications.filter(
      (n) => n.notification_type === "WOS_TIMER" && n.action_url && n.action_url.includes(pattern)
    );
    return [match, []];
  }

  if (query.startsWith("SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_TIMER'")) {
    const pattern = params[0].replace(/%/g, "");
    const match = mockNotifications.filter(
      (n) => n.notification_type === "WOS_TIMER" && n.action_url && n.action_url.includes(pattern)
    );
    return [match, []];
  }

  if (query.startsWith("SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_ESCALATION_HISTORY'")) {
    const match = mockNotifications.filter((n) => n.notification_type === "WOS_ESCALATION_HISTORY");
    if (params[0]) {
      const pattern = params[0].replace(/%/g, "");
      const filtered = match.filter((m) => m.action_url.includes(pattern));
      return [filtered, []];
    }
    return [match, []];
  }

  if (query.startsWith("SELECT * FROM job_cards WHERE job_id = ?")) {
    const jobId = params[0];
    const match = mockJobCards.filter((j) => j.job_id === jobId);
    return [match, []];
  }

  if (query.startsWith("UPDATE job_cards SET priority = 'High' WHERE job_id = ?")) {
    const jobId = params[0];
    const job = mockJobCards.find((j) => j.job_id === jobId);
    if (job) job.priority = "High";
    return [[], []];
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
  console.log("STARTING ENTERPRISE ESCALATION ENGINE TESTS");
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
  const policy = new EscalationPolicy();
  const mockSms = new MockSmsProvider();
  const notificationEngine = new NotificationEngine(bus);
  notificationEngine.registerProvider(mockSms);

  const engine = new EscalationEngine(bus, notificationEngine, policy);

  // Subscribe to escalation events
  const eventsFired: string[] = [];
  bus.subscribe("SLA_ESCALATED", (evt: any) => {
    eventsFired.push(evt.payload.severity);
  });

  // Setup Job Cards Mock
  mockJobCards = [
    {
      job_id: 111,
      job_card_no: "JC-111",
      customer_name: "Standard Client",
      priority: "Medium",
      emergency_flag: 0,
      current_workflow_state: "INTAKE_PENDING",
      created_by: 1,
    },
    {
      job_id: 222,
      job_card_no: "JC-222",
      customer_name: "VIP Guest",
      priority: "VIP",
      emergency_flag: 0,
      current_workflow_state: "QC_PENDING",
      created_by: 1,
    },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // 1. UNIT TESTS: ESCALATION POLICIES & MULTIPLIERS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Unit Test Suite ---");

  const vipLimit = policy.calculateLimitMinutes(30, { isVip: true });
  assert(vipLimit === 15, "VIP priority multiplier adjusts SLA limit from 30m to 15m (0.5x)");

  const emergencyLimit = policy.calculateLimitMinutes(30, { isEmergency: true });
  assert(emergencyLimit === 9, "Emergency flag multiplier adjusts SLA limit from 30m to 9m (0.3x)");

  const fleetLimit = policy.calculateLimitMinutes(30, { isFleet: true });
  assert(fleetLimit === 21, "Fleet priority multiplier adjusts SLA limit from 30m to 21m (0.7x)");

  const highLimit = policy.calculateLimitMinutes(30, { priorityLevel: "HIGH" });
  assert(highLimit === 24, "High priority level adjusts SLA limit from 30m to 24m (0.8x)");


  // ═══════════════════════════════════════════════════════════════════
  // 2. HOLIDAY & SHIFT CHANGE CALENDAR SIMULATION
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Holiday & Shift Calendar Simulation ---");

  // January 1st is registered holiday in config
  const holidayDate = new Date("2026-01-01T12:00:00");
  assert(policy.isHoliday(holidayDate) === true, "Holiday calendar correctly flags registered holidays");

  const normalDate = new Date("2026-07-10T12:00:00"); // Friday afternoon
  assert(policy.isHoliday(normalDate) === false, "Holiday calendar correctly ignores regular workdays");

  const midnightDate = new Date("2026-07-10T23:30:00"); // 11:30 PM
  assert(policy.isWorkingHour(midnightDate) === false, "Shift calendar correctly excludes non-working hours");

  const noonDate = new Date("2026-07-10T12:30:00"); // 12:30 PM
  assert(policy.isWorkingHour(noonDate) === true, "Shift calendar correctly includes working shift hours");


  // ═══════════════════════════════════════════════════════════════════
  // 3. PERSISTENT TIMERS & PAUSE/RESUME ACCUMULATIONS (STRESS TEST)
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Persistent Timers & Pause/Resume Simulation ---");

  mockNotifications = [];
  await EscalationTimer.start(111, "MISSING_ETD", 30);
  
  let activeTimer = await EscalationTimer.getTimer(111, "MISSING_ETD");
  assert(activeTimer?.status === "RUNNING", "Persistent timer created and started in RUNNING status");

  // Pause the timer
  await EscalationTimer.pause(111, "MISSING_ETD");
  let pausedTimer = await EscalationTimer.getTimer(111, "MISSING_ETD");
  assert(pausedTimer?.status === "PAUSED" && pausedTimer.lastPausedTime !== undefined, "Persistent timer successfully paused");

  // Wait and resume
  await new Promise((resolve) => setTimeout(resolve, 50));
  await EscalationTimer.resume(111, "MISSING_ETD");
  let resumedTimer = await EscalationTimer.getTimer(111, "MISSING_ETD");
  assert(resumedTimer?.status === "RUNNING" && resumedTimer.accumulatedMs > 0, "Timer resumed; elapsed pause duration accumulated");


  // ═══════════════════════════════════════════════════════════════════
  // 4. INTEGRATION TEST: SLA BREACH ALERTS & NOTIFICATION ROUTING
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Integration Test Suite ---");

  mockNotifications = [];
  mockAuditLogs = [];
  eventsFired.length = 0;
  mockSms.sentLogs.length = 0;

  // Setup already running timer that has breached (started 45 minutes ago, limit 15 minutes)
  const expiredTime = new Date(Date.now() - 45 * 60 * 1000);
  const breachedTimer: TimerRecord = {
    jobId: 111,
    type: "MISSING_ETD",
    status: "RUNNING",
    startTime: expiredTime.toISOString(),
    accumulatedMs: 0,
    limitMinutes: 15,
  };
  
  // Store breached timer directly in DB mock
  await db.execute(
    "INSERT INTO tbl_notifications (user_id, notification_type, message, priority, related_job_id, action_url)",
    [1, "WOS_TIMER", "Staged Timer", "LOW", 111, JSON.stringify(breachedTimer)]
  );

  // Evaluate Job -> triggers INFO (L0)
  await engine.evaluateJob(111, "CORR-E-100");

  assert(eventsFired.includes("INFO"), "SLA breach event triggered and published to EventBus");
  assert(mockSms.sentLogs.length === 1, "Breach notification successfully routed to NotificationEngine SMS channel");
  
  // Verify History logged
  const historyExists = await EscalationHistory.isAlreadyEscalated(111, "MISSING_ETD", "INFO");
  assert(historyExists === true, "Escalation logged to the database history ledger");

  // Verify Audit Trail row was generated
  assert(
    mockAuditLogs.some((a) => a.entity_id === 111 && a.action_code === "SLA_ESCALATION"),
    "Escalation event logged to the system audit trail"
  );


  // ═══════════════════════════════════════════════════════════════════
  // 5. REPEAT ESCALATION & LEVEL PROGRESSION TESTS
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Multi-Level Escalation & Progression Tests ---");

  eventsFired.length = 0;
  mockSms.sentLogs.length = 0;

  // Subsequent evaluate runs should progress up the escalation ladder
  // INFO exists -> escalate to WARNING
  await engine.evaluateJob(111, "CORR-E-200");
  assert(eventsFired.includes("WARNING"), "Escalated from INFO to WARNING on next cycle");
  assert(mockSms.sentLogs.length === 1, "Alert sent to Supervisor (L1) on level upgrade");

  eventsFired.length = 0;
  mockSms.sentLogs.length = 0;

  // WARNING exists -> escalate to CRITICAL
  await engine.evaluateJob(111, "CORR-E-300");
  assert(eventsFired.includes("CRITICAL"), "Escalated from WARNING to CRITICAL");
  assert(mockSms.sentLogs.length === 1, "Alert sent on CRITICAL breach");

  eventsFired.length = 0;
  mockSms.sentLogs.length = 0;

  // CRITICAL exists -> escalate to EMERGENCY
  await engine.evaluateJob(111, "CORR-E-400");
  assert(eventsFired.includes("EMERGENCY"), "Escalated to EMERGENCY level");
  assert(mockSms.sentLogs.length === 1, "Alert sent on EMERGENCY level");

  eventsFired.length = 0;
  mockSms.sentLogs.length = 0;

  // Repeat evaluation at terminal level (EMERGENCY) should not duplicate
  await engine.evaluateJob(111, "CORR-E-500");
  assert(mockSms.sentLogs.length === 0, "No duplicate notification sent once terminal level is reached");


  // ═══════════════════════════════════════════════════════════════════
  // 6. CRASH & RESTART RECOVERY TEST
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Crash & Restart Recovery Test ---");

  // Simulate Crash: Clear all active memory variables, leaving mockNotifications DB mock intact
  console.log("[Simulation] Server crashed. Initializing recovery...");
  
  // Re-verify that timers and history logs survived the crash (persisted in DB mock)
  const recoveredTimers = await EscalationTimer.getActiveTimers();
  assert(recoveredTimers.length === 1, "Active timers successfully recovered from DB store");

  const recoveredHistory = await EscalationHistory.isAlreadyEscalated(111, "MISSING_ETD", "INFO");
  assert(recoveredHistory === true, "Escalation history successfully recovered from DB store");


  // ═══════════════════════════════════════════════════════════════════
  // 7. ESCALATION ANALYTICS TEST
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n--- Running Escalation Analytics Test ---");

  // Resolve escalation to generate resolution stats
  await EscalationHistory.resolveEscalation(111, "MISSING_ETD", false);

  const stats = await EscalationAnalytics.getAnalytics();
  assert(stats.totalEscalations === 4, "Analytics tracks total escalation instances correctly");
  assert(stats.slaAchievementPct > 0, "SLA Achievement percentage successfully computed");
  assert(stats.effectivenessPct === 100, "SLA Escalation Effectiveness calculated successfully");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
