// =============================================================================
// WOS TransactionManager Unit Tests (Phase 5A)
// Execution: npx tsx src/tests/transaction-manager.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { EventBus } from "../core/event-bus";
import { TransactionManager } from "../core/transaction-manager";

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING TRANSACTIONMANAGER UNIT TESTS (MOCK CONNECTION MODE)");
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

  // ═══════════════════════════════════════════════════════════════════
  // CONNECTION MOCK EMULATOR
  // ═══════════════════════════════════════════════════════════════════
  const queriesExecuted: string[] = [];
  let connectionReleased: boolean = false;

  const mockConnection = {
    query: async (sql: string) => {
      queriesExecuted.push(sql.trim());
      return [[]];
    },
    release: () => {
      connectionReleased = true;
    },
  };

  db.getConnection = async (): Promise<any> => {
    connectionReleased = false;
    return mockConnection;
  };

  // Setup EventBus and TransactionManager
  const bus = new EventBus();
  const tm = new TransactionManager(bus);

  // Subscribe to transaction events for assertion
  const eventsCaptured: { topic: string; corrId: string; valId?: string }[] = [];
  bus.subscribe("*", (event: any) => {
    if (event.topic.startsWith("TX_")) {
      eventsCaptured.push({
        topic: event.topic,
        corrId: event.correlationId,
        valId: event.validationRunId,
      });
    }
  });

  // Test 1: Root Transaction Commit
  queriesExecuted.length = 0;
  const result1 = await tm.runInTransaction(
    async (tx) => {
      assert(tx.savepointDepth === 0, "Root transaction is at level 0");
      return "SUCCESS_VAL";
    },
    "CORR-ROOT-100",
    "VAL-ROOT-200"
  );

  assert(result1 === "SUCCESS_VAL", "Root transaction block returned expected value");
  assert(queriesExecuted[0] === "START TRANSACTION", "Root transaction sent START TRANSACTION");
  assert(queriesExecuted[1] === "COMMIT", "Root transaction sent COMMIT");
  assert(Boolean(connectionReleased), "Connection released at root completion");

  // Verify events propagated
  assert(
    eventsCaptured.some((e) => e.topic === "TX_BEGIN" && e.corrId === "CORR-ROOT-100" && e.valId === "VAL-ROOT-200"),
    "TX_BEGIN event propagated with metadata"
  );
  assert(
    eventsCaptured.some((e) => e.topic === "TX_COMMIT" && e.corrId === "CORR-ROOT-100" && e.valId === "VAL-ROOT-200"),
    "TX_COMMIT event propagated with metadata"
  );

  // Test 2: Root Transaction Rollback & LIFO Compensation
  queriesExecuted.length = 0;
  eventsCaptured.length = 0;
  const compensationsRun: string[] = [];

  try {
    await tm.runInTransaction(
      async (tx) => {
        tm.registerCompensation(tx, async () => {
          compensationsRun.push("FIRST_COMPENSATION");
        });
        tm.registerCompensation(tx, async () => {
          compensationsRun.push("SECOND_COMPENSATION");
        });
        throw new Error("Simulated rollback error");
      },
      "CORR-FAIL-300"
    );
  } catch (err: any) {
    assert(err.message === "Simulated rollback error", "Caught simulated rollback exception");
  }

  assert(queriesExecuted[0] === "START TRANSACTION", "Root transaction started on failure path");
  assert(queriesExecuted[1] === "ROLLBACK", "Root transaction rolled back on exception");
  assert(Boolean(connectionReleased), "Connection released on rollback path");
  assert(
    compensationsRun[0] === "SECOND_COMPENSATION" && compensationsRun[1] === "FIRST_COMPENSATION",
    "Compensation callbacks executed in correct LIFO (last-in, first-out) order"
  );
  assert(
    eventsCaptured.some((e) => e.topic === "TX_ROLLBACK" && e.corrId === "CORR-FAIL-300"),
    "TX_ROLLBACK event propagated to EventBus"
  );

  // Test 3: Nested Transaction Savepoints & Release
  queriesExecuted.length = 0;
  eventsCaptured.length = 0;

  await tm.runInTransaction(
    async (parentTx) => {
      await tm.runInTransaction(
        async (childTx) => {
          assert(childTx.savepointDepth === 1, "Child transaction is at nested level 1");
          assert(childTx.connection === parentTx.connection, "Child transaction shares connection with parent");
        },
        "CORR-NEST-400",
        undefined,
        parentTx
      );
    },
    "CORR-PARENT-500"
  );

  assert(queriesExecuted[0] === "START TRANSACTION", "Parent started main transaction block");
  assert(queriesExecuted[1].startsWith("SAVEPOINT SP_1_"), "Child generated SQL SAVEPOINT query");
  assert(queriesExecuted[2].startsWith("RELEASE SAVEPOINT SP_1_"), "Child generated SQL RELEASE SAVEPOINT query");
  assert(queriesExecuted[3] === "COMMIT", "Parent committed main transaction block");
  assert(
    eventsCaptured.some((e) => e.topic === "TX_SAVEPOINT_CREATED" && e.corrId === "CORR-NEST-400"),
    "TX_SAVEPOINT_CREATED event published for nested block"
  );

  // Test 4: Nested Transaction Savepoint Rollback
  queriesExecuted.length = 0;
  eventsCaptured.length = 0;
  let childCompensationsRun: boolean = false;

  await tm.runInTransaction(
    async (parentTx) => {
      try {
        await tm.runInTransaction(
          async (childTx) => {
            tm.registerCompensation(childTx, () => {
              childCompensationsRun = true;
            });
            throw new Error("Child failed");
          },
          "CORR-CHILD-FAIL",
          undefined,
          parentTx
        );
      } catch (err) {
        // Suppress child error to let parent finish
      }
    },
    "CORR-PARENT-OK"
  );

  assert(queriesExecuted[0] === "START TRANSACTION", "Parent started transaction");
  assert(queriesExecuted[1].startsWith("SAVEPOINT SP_1_"), "Child created savepoint");
  assert(queriesExecuted[2].startsWith("ROLLBACK TO SAVEPOINT SP_1_"), "Child rolled back to savepoint on fail");
  assert(queriesExecuted[3] === "COMMIT", "Parent committed successfully after nested rollback");
  assert(Boolean(childCompensationsRun), "Child compensation callbacks executed after nested rollback");

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
