// =============================================================================
// WOS NotificationEngine Unit Tests (Sprint 5)
// =============================================================================

import { NotificationEngine, globalNotificationEngine } from "../core/notification-engine";

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

  try {
    globalNotificationEngine.initialize();
    assert(true, "Notification engine initialized successfully");
  } catch (err) {
    assert(false, "Notification engine initialization failed");
  }

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
