/**
 * =============================================================================
 * WOS Core Architecture: Identity & RBAC Performance Benchmarks
 * Bounded Context: Core System / Diagnostics & Performance
 * =============================================================================
 */

import { pool as db } from "../src/db/index.ts";
import { EmployeeRepository, PermissionRepository, AuditRepository } from "../src/core/repositories.ts";
import { EmployeeIdentityService, RoleService, AuditService } from "../src/core/identity.ts";

async function runBenchmark() {
  console.log("=============================================================");
  console.log("STARTING WORKFORCE IDENTITY & RBAC LATENCY BENCHMARKS");
  console.log("=============================================================");

  const ITERATIONS = 50;

  // Initialize Container
  const auditRepo = new AuditRepository(db);
  const employeeRepo = new EmployeeRepository(db);
  const permissionRepo = new PermissionRepository(db);

  AuditService.init(auditRepo);
  EmployeeIdentityService.init(employeeRepo, auditRepo);
  RoleService.init(permissionRepo, auditRepo);

  // 1. Employee Lookup Benchmark
  console.log(`\n1. Running Employee Lookup Benchmark (${ITERATIONS} iterations)...`);
  const t0 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    // Select a random id from canonical advisor Mustafa
    await EmployeeIdentityService.getEmployeeById(12);
  }
  const t1 = performance.now();
  const employeeLookupTime = (t1 - t0) / ITERATIONS;
  console.log(`   └─ Mean Latency (Service -> Repo -> MySQL): ${employeeLookupTime.toFixed(4)} ms`);

  // 2. Permission Check Benchmark
  console.log(`\n2. Running Permission Check Benchmark (${ITERATIONS} iterations)...`);
  const t2 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await RoleService.hasPermission("service_advisor", "Breakdowns", "view");
  }
  const t3 = performance.now();
  const permissionCheckTime = (t3 - t2) / ITERATIONS;
  console.log(`   └─ Mean Latency (Service -> Repo -> MySQL): ${permissionCheckTime.toFixed(4)} ms`);

  // 3. Security Audit Log Insert Benchmark
  console.log(`\n3. Running Security Audit Log Insert Benchmark (${ITERATIONS} iterations)...`);
  const t4 = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await AuditService.logAction(999, "admin_bench", "BENCHMARK_RUN", `Iteration run ${i}`);
  }
  const t5 = performance.now();
  const auditInsertTime = (t5 - t4) / ITERATIONS;
  console.log(`   └─ Mean Latency (Service -> Repo -> MySQL): ${auditInsertTime.toFixed(4)} ms`);

  // Cleanup benchmark logs from db to avoid clutter
  try {
    await db.execute("DELETE FROM security_audit_logs WHERE username = 'admin_bench'");
    console.log("\nCleanup: Benchmark logs cleared successfully.");
  } catch (err: any) {
    console.warn("Cleanup warning:", err.message);
  }

  console.log("\n=============================================================");
  console.log("BENCHMARK COMPLETED SUCCESSFULLY");
  console.log("=============================================================");

  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
