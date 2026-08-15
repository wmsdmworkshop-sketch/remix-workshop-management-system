// =============================================================================
// WOS EventBus Unit Tests (Phase 5A)
// Execution: npx tsx src/tests/event-bus.test.ts
// =============================================================================

import { EventBus, globalIdempotencyRegistry } from "../core/event-bus";

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
  let test1Fired: boolean = false;
  let receivedPayload: any = null;
  const handler1 = (event: any) => {
    test1Fired = true;
    receivedPayload = event.payload;
  };

  bus.subscribe("TEST_TOPIC", handler1);
  await bus.publish("TEST_TOPIC", { key: "value" }, "CORR-001");
  assert(Boolean(test1Fired), "Direct topic subscriber fired successfully");
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
  let wildcardFired: boolean = false;
  let wildcardPayload: any = null;
  bus.subscribe("*", (event: any) => {
    wildcardFired = true;
    wildcardPayload = event.payload;
  });
  await bus.publish("ANY_RANDOM_TOPIC", { wild: "yes" }, "CORR-003");
  assert(Boolean(wildcardFired), "Wildcard '*' matches random topic");
  assert(wildcardPayload?.wild === "yes", "Wildcard subscriber receives payload correctly");

  // Test 4: Pattern Wildcard Subscription (JOB_*)
  let prefixFired: boolean = false;
  bus.subscribe("JOB_*", (event: any) => {
    if (event.topic === "JOB_CREATED") prefixFired = true;
  });
  await bus.publish("JOB_CREATED", {}, "CORR-004");
  assert(Boolean(prefixFired), "Pattern wildcard 'JOB_*' matches prefix 'JOB_CREATED'");

  // Test 5: Async Handlers
  let asyncFinished: boolean = false;
  bus.subscribe("ASYNC_TOPIC", async (event: any) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    asyncFinished = true;
  });
  await bus.publish("ASYNC_TOPIC", {}, "CORR-005");
  assert(Boolean(asyncFinished), "Async handler awaited successfully during publish");

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

  // Test 8: Dead Letter Queue (DLQ)
  let dlqTriggered = false;
  bus.subscribe("DLQ_TOPIC", async (event: any) => {
    throw new Error("DLQ simulation error");
  });
  await bus.publish("DLQ_TOPIC", {}, "CORR-DLQ", undefined, { maxAttempts: 2, delayMs: 5 });
  assert(bus.deadLetterQueue.length === 1, "Failed event successfully routed to DLQ");
  assert(bus.deadLetterQueue[0].topic === "DLQ_TOPIC", "DLQ record contains correct topic");
  assert(bus.deadLetterQueue[0].error === "DLQ simulation error", "DLQ record contains correct error message");

  // Test 9: Idempotency Processing
  globalIdempotencyRegistry.clear();
  let processCount = 0;
  bus.subscribe("IDEMPOTENT_TOPIC", (event: any) => {
    if (globalIdempotencyRegistry.isDuplicate(event.eventId)) {
      return;
    }
    processCount++;
    globalIdempotencyRegistry.markProcessed(event.eventId);
  });

  const tempEnvelope = (bus as any).createEnvelope("IDEMPOTENT_TOPIC", {}, "CORR-IDEM");
  // Publish manually using the envelope to simulate duplicate delivery of same eventId
  await (bus as any).publish("IDEMPOTENT_TOPIC", {}, "CORR-IDEM"); // Generates random ID
  assert(processCount === 1, "Event processed first time");

  // Now process with same eventId
  const handlers = (bus as any).handlers.get("IDEMPOTENT_TOPIC") || [];
  for (const handler of handlers) {
    await handler(tempEnvelope);
    await handler(tempEnvelope); // Repeat
  }
  assert(processCount === 2, "Second distinct event processed, but duplicates of tempEnvelope ignored");

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
