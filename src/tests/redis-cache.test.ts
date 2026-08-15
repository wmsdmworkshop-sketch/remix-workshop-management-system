/**
 * =============================================================================
 * DWIP Enterprise Platform — WP-07 Redis Infrastructure Test Suite
 * Execution: npx tsx src/tests/redis-cache.test.ts
 * Description: Validates Redis cache operations, TTL expiry, namespace flushing,
 *              hit/miss metrics, and graceful in-memory fallback.
 * =============================================================================
 */

import { redisService, RedisService } from "../cache/redis-service.ts";

async function runRedisCacheTests() {
  console.log("=============================================================================");
  console.log("STARTING DWIP REDIS & RESILIENCE CACHE TEST SUITE (WP-07)");
  console.log("=============================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    redisService.resetMetrics();

    // -------------------------------------------------------------------------
    // 1. Basic Set, Get & Delete Operations
    // -------------------------------------------------------------------------
    console.log("\n--- Category 1: Key Set, Get & Delete Operations ---");
    await redisService.set("dwip:auth:user_1", { id: 1, role: "Admin" }, 60);

    const cachedUser = await redisService.get<{ id: number; role: string }>("dwip:auth:user_1");
    assert(cachedUser !== null, "Value retrieved from cache is not null");
    assert(cachedUser?.id === 1, "Cached user ID matches stored payload");
    assert(cachedUser?.role === "Admin", "Cached user role matches stored payload");

    await redisService.del("dwip:auth:user_1");
    const deletedUser = await redisService.get("dwip:auth:user_1");
    assert(deletedUser === null, "Deleted cache key returns null");

    // -------------------------------------------------------------------------
    // 2. TTL Expiry Test
    // -------------------------------------------------------------------------
    console.log("\n--- Category 2: TTL Expiry Evaluation ---");
    // Set short TTL of -1 seconds (already expired)
    await redisService.set("dwip:session:exp_1", { session: "test" }, -1);
    const expiredItem = await redisService.get("dwip:session:exp_1");
    assert(expiredItem === null, "Expired cache key gracefully returns null");

    // -------------------------------------------------------------------------
    // 3. Namespace Flush Operations
    // -------------------------------------------------------------------------
    console.log("\n--- Category 3: Namespace Flushing ---");
    await redisService.set("dwip:auth:perm_1", true, 60);
    await redisService.set("dwip:auth:perm_2", false, 60);
    await redisService.set("dwip:kpi:snapshot", { revenue: 50000 }, 60);

    const flushedCount = await redisService.flushNamespace("dwip:auth:");
    assert(flushedCount === 2, "flushNamespace('dwip:auth:') flushed exactly 2 matching keys");

    const nonAuthItem = await redisService.get("dwip:kpi:snapshot");
    assert(nonAuthItem !== null, "Non-matching namespace keys preserved during flush");

    // -------------------------------------------------------------------------
    // 4. In-Memory Fallback Verification
    // -------------------------------------------------------------------------
    console.log("\n--- Category 4: Graceful In-Memory Fallback Verification ---");
    redisService.setOnlineState(false);
    assert(redisService.isOnline() === false, "setOnlineState(false) trips online status to offline");

    await redisService.set("dwip:fallback:test", "fallback_value", 30);
    const fallbackVal = await redisService.get<string>("dwip:fallback:test");
    assert(fallbackVal === "fallback_value", "In-memory cache fallback works seamlessly when Redis is offline");

    // -------------------------------------------------------------------------
    // 5. Metrics Tracking
    // -------------------------------------------------------------------------
    console.log("\n--- Category 5: Cache Telemetry & Metrics ---");
    const metrics = redisService.getMetrics();
    assert(metrics.hitCount >= 2, "Hit counter correctly records cache hits");
    assert(metrics.missCount >= 2, "Miss counter correctly records cache misses");

  } catch (err: any) {
    console.error("FATAL ERROR in Redis Cache Test Suite:", err);
    failed++;
  } finally {
    console.log("\n=============================================================================");
    console.log(`REDIS CACHE TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
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
}

runRedisCacheTests();
