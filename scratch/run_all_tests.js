import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const testsDir = path.resolve('src/tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.ts'));

console.log('=============================================================================');
const startTime = Date.now();

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const file of files) {
  const filePath = path.join(testsDir, file);
  console.log(`\n▶ Running: ${file}`);
  try {
    const output = execSync(`npx tsx "${filePath}"`, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(output);
    results.push({ file, success: true });
    totalPassed++;
  } catch (err) {
    console.error(`❌ Failed: ${file}`);
    console.error(err.stdout || err.stderr || err.message);
    results.push({ file, success: false, error: err.message });
    totalFailed++;
  }
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);
console.log('=============================================================================');
console.log(`TEST RUN SUMMARY: ${totalPassed} suites passed, ${totalFailed} suites failed.`);
console.log(`Duration: ${duration}s`);
console.log('=============================================================================');

fs.writeFileSync(
  path.resolve('src/tests/test_run_results.json'),
  JSON.stringify({ totalPassed, totalFailed, duration, results }, null, 2)
);
