import { defineConfig } from 'vitest/config';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Two test harnesses live under src/tests:
//   1. Vitest suites  — use describe()/it()/test(). Run by this config.
//   2. Legacy scripts — use a custom runTestSuite() helper and call
//      process.exit(1) on failure. Vitest cannot register these as suites
//      (reports "No test suite found"), and their process.exit() crashes the
//      Vitest worker, cascading failures into unrelated files.
// src/tests contains THREE test harnesses; only the first is Vitest:
//   1. Vitest        — describe()/it()/test(), no process.exit, no node:test.
//   2. Custom script — a runTestSuite()/custom test() helper + process.exit().
//   3. node:test     — imports from 'node:test' (Node's built-in runner).
// A file is NON-VITEST if it imports node:test, calls process.exit() (real
// Vitest tests never do), or registers no describe/it/test at all. Those are
// EXCLUDED here so the Vitest run is honest and stable; they are executed by
// `npm run test:legacy` (test-infra/run_legacy_tests.cjs).
// ---------------------------------------------------------------------------
const TESTS_DIR = join(__dirname, 'src', 'tests');
const HAS_VITEST_SUITE = /\b(describe|it|test)\s*\(/;
const CALLS_PROCESS_EXIT = /process\.exit\s*\(/;
const IMPORTS_NODE_TEST = /from\s+['"]node:test['"]/;
const isLegacy = (src: string) =>
  IMPORTS_NODE_TEST.test(src) || CALLS_PROCESS_EXIT.test(src) || !HAS_VITEST_SUITE.test(src);

const legacyExcludes = readdirSync(TESTS_DIR)
  .filter((f) => f.endsWith('.test.ts'))
  .filter((f) => isLegacy(readFileSync(join(TESTS_DIR, f), 'utf8')))
  .map((f) => `src/tests/${f}`);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/tests/**/*.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.ts',
      'tests/**',
      ...legacyExcludes
    ],
    setupFiles: [
      'src/tests/setup.ts'
    ],
  },
});
