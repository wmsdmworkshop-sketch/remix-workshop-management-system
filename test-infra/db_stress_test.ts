import { pool as db } from "../src/db/index.ts";

async function runStressTest() {
  console.log("=============================================================");
  console.log("DWIP ENTERPRISE DATABASE INFRASTRUCTURE STRESS TEST");
  console.log("=============================================================");

  const queryToRun = "SELECT * FROM employees LIMIT 1";

  // Helper to run N concurrent queries
  async function runConcurrency(concurrency: number, desc: string) {
    console.log(`\nRunning Stress Test: ${desc} (${concurrency} concurrent queries)...`);
    const latencies: number[] = [];
    let failures = 0;
    let timeouts = 0;

    const promises = Array.from({ length: concurrency }).map(async (_, idx) => {
      const start = performance.now();
      try {
        await db.execute(queryToRun);
        const end = performance.now();
        latencies.push(end - start);
      } catch (err: any) {
        failures++;
        if (err.message?.toLowerCase().includes("timeout") || err.code === "ETIMEDOUT") {
          timeouts++;
        }
        console.error(`Query ${idx} failed:`, err.message);
      }
    });

    await Promise.all(promises);

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
    const maxLatency = Math.max(...latencies, 0);

    console.log(`   ├─ Successful Queries:  ${latencies.length}`);
    console.log(`   ├─ Connection Failures: ${failures}`);
    console.log(`   ├─ Timeouts:            ${timeouts}`);
    console.log(`   ├─ Average Latency:     ${avgLatency.toFixed(2)} ms`);
    console.log(`   └─ Maximum Latency:     ${maxLatency.toFixed(2)} ms`);
    return { avgLatency, maxLatency, failures, timeouts };
  }

  // 1. 10 Concurrent Queries
  await runConcurrency(10, "10 Concurrent Connections");

  // 2. 25 Concurrent Queries
  await runConcurrency(25, "25 Concurrent Connections");

  // 3. 50 Concurrent Queries
  await runConcurrency(50, "50 Concurrent Queries");

  // Clean up pool
  console.log("\nEnding database connection pool...");
  await db.end();
  console.log("Pool ended successfully.");
  console.log("=============================================================");
}

runStressTest().catch(async (err) => {
  console.error("Stress test failed:", err);
  try {
    await db.end();
  } catch (e) {}
  process.exit(1);
});
