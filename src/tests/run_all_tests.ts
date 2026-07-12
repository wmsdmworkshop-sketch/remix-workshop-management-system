import { spawnSync } from "child_process";
import path from "path";

const tests = [
  "cr002-event-engine.test.ts",
  "workflow-engine.test.ts",
  "timeline-platform.test.ts",
  "workflow-reception-integration.test.ts",
  "security-module.test.ts"
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
