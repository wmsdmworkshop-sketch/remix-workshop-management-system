import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Component-test project — P1 acceptance only.
 *
 * Deliberately SEPARATE from vitest.config.ts:
 *
 *  - that project is `environment: 'node'` and its setupFiles run
 *    `destructive_test_guard`, which opens a MySQL connection. These tests need
 *    no database at all, so they must not inherit that setup.
 *  - these specs are `.test.tsx`; the node project includes only `.test.ts`, so
 *    the two never collide.
 *
 * ISOLATION: the components under test import no database, server or network
 * module (verified: zero matches for `db/`, `server`, `mysql2`, `/core/` in
 * their import graphs). Every boundary they touch is `fetch`, which each spec
 * stubs. Nothing here can boot server.ts, run the boot-time revenue
 * recomputation, start a scheduler, or reach a shared resource.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/tests/components/**/*.test.tsx'],
    setupFiles: ['src/tests/components/setup.components.ts'],
    // No DB guard here by design — see above. The guard protects tests that
    // talk to MySQL; these do not, and loading it would open a connection for
    // no reason.
  },
});
