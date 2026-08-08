import { verifyTestIsolation } from './destructive_test_guard.ts';

// Central Vitest setup hook that runs BEFORE all test suites.
// Guarantees test isolation before any tests run.
export async function setup() {
  await verifyTestIsolation();
}
