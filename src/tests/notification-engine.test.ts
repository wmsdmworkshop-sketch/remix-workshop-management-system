// =============================================================================
// WOS NotificationEngine Unit Tests (Phase 5A)
// Execution: npx tsx src/tests/notification-engine.test.ts
// =============================================================================

import { EventBus } from "../core/event-bus";
import {
  MockInAppProvider,
  MockSmsProvider,
  MockWhatsAppProvider,
  MockEmailProvider,
  MockPushProvider,
} from "../core/notification-provider";
import { NotificationEngine } from "../core/notification-engine";

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING NOTIFICATIONENGINE UNIT TESTS");
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

  // Setup dependencies
  const bus = new EventBus();
  const engine = new NotificationEngine(bus);

  const mockInApp = new MockInAppProvider();
  const mockSms = new MockSmsProvider();
  const mockWhatsApp = new MockWhatsAppProvider();
  const mockEmail = new MockEmailProvider();
  const mockPush = new MockPushProvider();

  engine.registerProvider(mockInApp);
  engine.registerProvider(mockSms);
  engine.registerProvider(mockWhatsApp);
  engine.registerProvider(mockEmail);
  engine.registerProvider(mockPush);

  // Subscribe to notification events
  const eventsCaptured: string[] = [];
  bus.subscribe("*", (event: any) => {
    eventsCaptured.push(event.topic);
  });

  // Test 1: Basic Send and Template Interpolation
  eventsCaptured.length = 0;
  mockInApp.sentLogs.length = 0;

  const success1 = await engine.sendNotification(
    {
      recipient: "USER_001",
      templateCode: "QC_FAILED",
      variables: { jobNo: "JC-100", reason: "Brake alignment off" },
      priority: "MEDIUM",
      primaryChannel: "IN_APP",
    },
    "CORR-NOTIF-001"
  );

  assert(success1 === true, "Basic send returns success status");
  assert(mockInApp.sentLogs.length === 1, "In-app provider registered send event");
  assert(
    mockInApp.sentLogs[0].message === "Job Card #JC-100 failed QC inspection due to: Brake alignment off.",
    "Template variables successfully interpolated"
  );
  assert(eventsCaptured.includes("NOTIFICATION_SENT"), "NOTIFICATION_SENT event published to EventBus");

  // Test 2: Silent Mode
  mockInApp.sentLogs.length = 0;
  engine.silentMode = true;

  const successSilent = await engine.sendNotification(
    {
      recipient: "USER_002",
      templateCode: "QC_FAILED",
      variables: { jobNo: "JC-100", reason: "None" },
      priority: "LOW",
      primaryChannel: "IN_APP",
    },
    "CORR-SILENT"
  );

  assert(successSilent === true, "Silent mode send returns true");
  assert(mockInApp.sentLogs.length === 0, "No dispatch occurred under Silent Mode");
  engine.silentMode = false; // restore

  // Test 3: Primary Channel Failure and Escalation
  mockSms.sentLogs.length = 0;
  mockEmail.sentLogs.length = 0;
  mockSms.shouldFail = true; // force SMS provider exception
  eventsCaptured.length = 0;

  const successEscalated = await engine.sendNotification(
    {
      recipient: "USER_003",
      templateCode: "SLA_BREACH",
      variables: { jobNo: "JC-999", state: "DIAGNOSTIC_WIP" },
      priority: "HIGH",
      primaryChannel: "SMS",
      escalationChannel: "EMAIL",
    },
    "CORR-ESC-001"
  );

  assert(successEscalated === true, "Escalation send returns success status");
  assert(mockSms.sentLogs.length === 0, "No successful dispatch logged on failed primary SMS channel");
  assert(mockEmail.sentLogs.length === 1, "Email escalation channel successfully executed fallback dispatch");
  assert(
    mockEmail.sentLogs[0].message ===
      "[ESCALATION] CRITICAL WARNING: Job Card #JC-999 breached SLA limit in stage DIAGNOSTIC_WIP.",
    "Escalation payload prefixed and formatted correctly"
  );
  assert(eventsCaptured.includes("NOTIFICATION_ESCALATED"), "NOTIFICATION_ESCALATED event published to EventBus");

  // Reset SMS provider status
  mockSms.shouldFail = false;

  // Test 4: Scheduled Message Processing
  mockPush.sentLogs.length = 0;
  const sendTimeFuture = new Date(Date.now() + 50); // 50ms into the future

  await engine.sendNotification(
    {
      recipient: "USER_004",
      templateCode: "QC_FAILED",
      variables: { jobNo: "JC-555", reason: "Door handle loose" },
      priority: "LOW",
      primaryChannel: "PUSH",
      sendAt: sendTimeFuture,
    },
    "CORR-SCH-100"
  );

  assert(mockPush.sentLogs.length === 0, "Push not dispatched immediately upon scheduling");
  
  // Wait for scheduler timer evaluation
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert(mockPush.sentLogs.length === 1, "Scheduled push successfully executed after delay threshold");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
