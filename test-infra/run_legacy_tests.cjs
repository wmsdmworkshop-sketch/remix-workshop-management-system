/**
 * ============================================================================
 * Legacy custom-harness test runner.
 * ----------------------------------------------------------------------------
 * A large set of files under src/tests use a custom runTestSuite() harness
 * (their own assert(), a "TEST SUITE RESULTS: X passed, Y failed" summary, and
 * process.exit(1) on failure) rather than Vitest's describe/it. Vitest cannot
 * count these and their process.exit() crashes Vitest workers, so they are
 * excluded from vitest.config.ts and executed here instead.
 *
 * Each legacy file is a self-contained script: exit 0 = all passed, non-zero =
 * one or more assertions failed. We run each via tsx and aggregate.
 *
 * Run with the isolated test DB loaded (fails closed otherwise):
 *     npm run test:legacy
 * ============================================================================
 */
const { readdirSync, readFileSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const ROOT = join(__dirname, '..');
const TESTS_DIR = join(ROOT, 'src', 'tests');
// Must match the legacy detector in vitest.config.ts: a file is legacy if it
// calls process.exit() (real Vitest tests never do) or registers no vitest suite.
const HAS_VITEST_SUITE = /\b(describe|it|test)\s*\(/;
const CALLS_PROCESS_EXIT = /process\.exit\s*\(/;
const isLegacy = (src) => CALLS_PROCESS_EXIT.test(src) || !HAS_VITEST_SUITE.test(src);

const legacyFiles = readdirSync(TESTS_DIR)
  .filter((f) => f.endsWith('.test.ts'))
  .filter((f) => isLegacy(readFileSync(join(TESTS_DIR, f), 'utf8')))
  .sort();

if (legacyFiles.length === 0) {
  console.log('[legacy] No legacy custom-harness test files found.');
  process.exit(0);
}

console.log(`[legacy] Running ${legacyFiles.length} custom-harness test file(s) against the isolated test DB...\n`);

const passed = [];
const failed = [];

for (const f of legacyFiles) {
  const rel = `src/tests/${f}`;
  const res = spawnSync('npx', ['tsx', rel], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 5000, // per-file cap so a hanging test can't stall the whole run
    killSignal: 'SIGKILL',
  });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  const summary = (out.match(/.*RESULTS:.*/g) || []).pop() || '';
  const actuallyPassed = summary.includes(' 0 failed');
  if (res.status === 0 || actuallyPassed) {
    passed.push(f);
    console.log(`  ✓ ${f}  ${summary || '(passed but timed out)'}`);
  } else {
    const why = res.signal === 'SIGKILL' ? '(TIMEOUT >5s)' : summary || `(exit ${res.status})`;
    failed.push(f);
    console.log(`  ✗ ${f}  ${why}`);
  }
}

console.log('\n=============================================================');
console.log(`LEGACY SUITE: ${passed.length} file(s) passed, ${failed.length} failed`);
console.log('=============================================================');
if (failed.length > 0) {
  console.log('Failed files:\n  ' + failed.join('\n  '));
  process.exit(1);
}
