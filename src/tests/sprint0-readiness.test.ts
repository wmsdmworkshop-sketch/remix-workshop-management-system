/**
 * =============================================================================
 * DWIP Enterprise Platform — Sprint 0 Readiness & Environment Verification Test
 * Execution: npx tsx src/tests/sprint0-readiness.test.ts
 * =============================================================================
 */

import fs from "fs";
import path from "path";
import { envConfig, validateEnvironment } from "../config/env.ts";

async function runSprint0ReadinessTest() {
  console.log("=============================================================================");
  console.log("STARTING SPRINT 0 FOUNDATION FREEZE & READINESS VERIFICATION TEST");
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
    // 1. Environment Variable Validation
    let envValid = false;
    try {
      validateEnvironment();
      envValid = true;
    } catch (e) {
      envValid = false;
    }
    assert(envValid, "Environment variables passed startup validation rules");

    // 2. Repository Structure Verification
    const workspaceRoot = process.cwd();
    const serverPath = path.join(workspaceRoot, "server.ts");
    const schemaPath = path.join(workspaceRoot, "src", "db", "schema.ts");
    const dbIndexPath = path.join(workspaceRoot, "src", "db", "index.ts");
    const testsDir = path.join(workspaceRoot, "src", "tests");
    const componentsDir = path.join(workspaceRoot, "src", "components");

    assert(fs.existsSync(serverPath), "server.ts baseline file exists");
    assert(fs.existsSync(schemaPath), "src/db/schema.ts database schema exists");
    assert(fs.existsSync(dbIndexPath), "src/db/index.ts persistence wrapper exists");
    assert(fs.existsSync(testsDir), "src/tests/ test suite directory exists");
    assert(fs.existsSync(componentsDir), "src/components/ UI component directory exists");

    // 3. Mandatory Specification & Governance Artifacts Check
    const brainDir = path.resolve(workspaceRoot, "..", "..", "brain", "ea3bc2ee-027b-4ac0-bb8d-77262271d442");
    const auditReportPath = path.join(brainDir, "DWIP_Enterprise_Architecture_Audit_Report.md");
    const blueprintPath = path.join(brainDir, "DWIP_Enterprise_Execution_Blueprint_V2.md");
    const freezeCertPath = path.join(brainDir, "DWIP_Milestone_0_Foundation_Freeze.md");

    assert(fs.existsSync(auditReportPath), "Architecture Audit Report artifact verified");
    assert(fs.existsSync(blueprintPath), "Version 2.x Execution Blueprint artifact verified");
    assert(fs.existsSync(freezeCertPath), "Milestone 0 Foundation Freeze certificate verified");

    // 4. Test Framework Readiness
    const runAllTestsPath = path.join(testsDir, "run_all_tests.ts");
    assert(fs.existsSync(runAllTestsPath), "run_all_tests.ts regression runner verified");

  } catch (err: any) {
    console.error("FATAL ERROR during Sprint 0 readiness check:", err);
    failed++;
  } finally {
    console.log("=============================================================================");
    console.log(`SPRINT 0 READINESS SUMMARY: ${passed} PASSED | ${failed} FAILED`);
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

runSprint0ReadinessTest();
