import { defineConfig } from 'vitest/config';

// ---------------------------------------------------------------------------
// Workshop ERP v2 test project — standalone.
//
// `root` is pinned to this folder on purpose. Vitest defaults `root` to
// process.cwd(), and this config is normally invoked from the repository root
// (`npx vitest run --config v2-rebuild/vitest.config.ts`), where an unpinned
// root would make `include` resolve against DWIP's src/ instead.
//
// No database, no .env, no dotenv. These are pure domain tests by design —
// see the repo-root vitest.config.ts for DWIP's own three harnesses.
// ---------------------------------------------------------------------------
export default defineConfig({
  root: __dirname,
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['default'],
  },
});
