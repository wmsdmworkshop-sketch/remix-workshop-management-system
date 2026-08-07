import { spawnSync } from "child_process";
import path from "path";

const tests = [
  "cr002-event-engine.test.ts",
  "workflow-engine.test.ts",
  "timeline-platform.test.ts",
  "workflow-reception-integration.test.ts",
  "security-module.test.ts",
  "identity-architecture.test.ts",
  "workshop-visit.test.ts",
  "operational-execution.test.ts",
  "orchestration.test.ts",
  "commercial.test.ts",
  "migration-engine.test.ts",
  "spcce-engine.test.ts",
  "kip-engine.test.ts",
  "keie-engine.test.ts",
  "vehicle-reception.test.ts",
  "technician-workbench.test.ts",
  "qc-verification.test.ts",
  "command-center.test.ts",
  "executive-intelligence.test.ts",
  "dre-rules-engine.test.ts",
  "human-capital.test.ts",
  "wice-engine.test.ts",
  "cxo-platform.test.ts",
  "cxo-platform-v1-v2.test.ts",
  "fleet-platform.test.ts",
  "ekg-platform.test.ts",
  "ai-hardening.test.ts",
  "pilot-platform.test.ts"
];

(async () => {
  console.log("=============================================================================");
  console.log("RUNNING ALL DWIP RELEASE-CRITICAL TEST SUITES");
  console.log("=============================================================================");

  let allPassed = true;

  for (const testFile of tests) {
    const testPath = path.join("src", "tests", testFile);
    console.log(`\n--- RUNNING: ${testFile} ---`);
    
    const result = spawnSync("npx", ["tsx", testPath], {
      encoding: "utf8",
      shell: true
    });

    console.log(result.stdout || "");
    if (result.stderr) {
      console.error("STDERR:", result.stderr);
    }

    if (result.status !== 0) {
      console.error(`[FAIL] ${testFile} exited with code ${result.status}`);
      allPassed = false;
    } else {
      console.log(`[OK] ${testFile} passed successfully.`);
    }
  }

  console.log("=============================================================================");
  if (allPassed) {
    console.log("ALL TEST SUITES PASSED PERFECTLY!");
    process.exit(0);
  } else {
    console.error("SOME TEST SUITES FAILED!");
    process.exit(1);
  }
})();
