// =============================================================================
// WOS EventBus Unit Tests (Phase 5A)
// Execution: npx tsx src/tests/event-bus.test.ts
// =============================================================================

import { EventBus } from "../core/event-bus";

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING EVENTBUS UNIT TESTS");
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

  const bus = new EventBus();

  // Test 1: Direct Topic Subscription and Publish
  let test1Fired = false;
  let receivedPayload: any = null;
  const handler1 = (event: any) => {
    test1Fired = true;
    receivedPayload = event.payload;
  };

  bus.subscribe("TEST_TOPIC", handler1);
  await bus.publish("TEST_TOPIC", { key: "value" }, "CORR-001");
  assert(test1Fired === true, "Direct topic subscriber fired successfully");
  assert(receivedPayload?.key === "value", "Payload correctly received by subscriber");

  // Test 2: Unsubscribe
  let test2FiredCount = 0;
  const handler2 = () => {
    test2FiredCount++;
  };
  bus.subscribe("TEST_UNSUB", handler2);
  await bus.publish("TEST_UNSUB", {}, "CORR-002");
  bus.unsubscribe("TEST_UNSUB", handler2);
  await bus.publish("TEST_UNSUB", {}, "CORR-002");
  assert(test2FiredCount === 1, "Unsubscribe removes subscriber successfully");

  // Test 3: Wildcard Subscription (*)
  let wildcardFired = false;
  let wildcardPayload: any = null;
  bus.subscribe("*", (event: any) => {
    wildcardFired = true;
    wildcardPayload = event.payload;
  });
  await bus.publish("ANY_RANDOM_TOPIC", { wild: "yes" }, "CORR-003");
  assert(wildcardFired === true, "Wildcard '*' matches random topic");
  assert(wildcardPayload?.wild === "yes", "Wildcard subscriber receives payload correctly");

  // Test 4: Pattern Wildcard Subscription (JOB_*)
  let prefixFired = false;
  bus.subscribe("JOB_*", (event: any) => {
    if (event.topic === "JOB_CREATED") prefixFired = true;
  });
  await bus.publish("JOB_CREATED", {}, "CORR-004");
  assert(prefixFired === true, "Pattern wildcard 'JOB_*' matches prefix 'JOB_CREATED'");

  // Test 5: Async Handlers
  let asyncFinished = false;
  bus.subscribe("ASYNC_TOPIC", async (event: any) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    asyncFinished = true;
  });
  await bus.publish("ASYNC_TOPIC", {}, "CORR-005");
  assert(asyncFinished === true, "Async handler awaited successfully during publish");

  // Test 6: Retry Support
  let failAttempts = 0;
  bus.subscribe("RETRY_TOPIC", async (event: any) => {
    failAttempts++;
    if (failAttempts < 3) {
      throw new Error("Temporary simulation error");
    }
  });

  await bus.publish("RETRY_TOPIC", {}, "CORR-006", undefined, { maxAttempts: 3, delayMs: 10 });
  assert(failAttempts === 3, "Retry policy automatically retried handler 3 times");

  // Test 7: Metadata Propagation
  let propagatedCorr = "";
  let propagatedVal = "";
  bus.subscribe("META_TOPIC", (event: any) => {
    propagatedCorr = event.correlationId;
    propagatedVal = event.validationRunId || "";
  });
  await bus.publish("META_TOPIC", {}, "CORR-777", "VAL-888");
  assert(propagatedCorr === "CORR-777", "CorrelationID propagated correctly");
  assert(propagatedVal === "VAL-888", "ValidationRunID propagated correctly");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
