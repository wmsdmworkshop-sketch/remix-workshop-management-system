---
name: "DWIP Test Instructions"
description: "Use when writing or running tests, setting up the test database, or debugging test failures in DWIP. Covers the three separate test harnesses, the destructive-test isolation guard, file naming and runner gotchas."
applyTo: ["src/tests/**", "tests/**", "test-infra/**", "vitest.config.ts", "vitest.components.config.ts", "playwright.config.ts", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"]
---

# DWIP Testing

Global rules and commands live in [AGENTS.md](../../AGENTS.md). **Test isolation is a non-negotiable EAR-001 rule.**

## Three harnesses — know which one you're writing for

| Config | Picks up | Environment | DB |
| --- | --- | --- | --- |
| `vitest.config.ts` | `src/tests/**/*.test.ts` | node, setup `src/tests/setup.ts` | **Requires MySQL `wms_test`** |
| `vitest.components.config.ts` | `src/tests/components/**/*.test.tsx` | jsdom, setup `setup.components.ts` | **No DB by design** |
| `playwright.config.ts` | `src/tests/**/*.e2e.spec.ts` | live server on `localhost:3001` | Live app (no `webServer` block — start it yourself) |

```bash
npm run db:setup:test      # once: provisions the isolated wms_test schema
npm run test:unit          # vitest, needs wms_test
npm run test:components    # jsdom, no DB
npm run test:legacy        # custom runner for the files vitest skips
npm run test:e2e           # start the server first
npm test                   # unit + legacy + integration
```

## Test isolation — do not weaken

- `test-infra/setup_test_db.ts` and `src/tests/setup.ts` run a `destructive_test_guard` that **fails closed**. It requires `NODE_ENV=test`, `DB_DATABASE=wms_test`, rejects the production identity (schema `railway`, host `35.200.150.167`), and asserts `SELECT DATABASE()` really returns `wms_test`.
- **`railway` is the legacy *name* of the production schema, not the host.** The database itself lives in **Google Cloud SQL**; the name is a fossil from the app's original Railway.app hosting. Don't rename it to "fix" the confusion — the guard denylists that exact string.
- Never loosen those checks, skip the guard, or point a test run at `.env`/`.env.rc1` to make something pass.
- Tests must never write to the dev or production database.

## Naming & placement

- Unit tests: `src/tests/**/*.test.ts`.
- Component tests: `src/tests/components/**/*.test.tsx` (jsdom, no DB).
- E2E: `src/tests/**/*.e2e.spec.ts` — the **only** `.spec.ts` pattern that runs anywhere.
- Reusable helpers live in `test-infra/` and `src/tests/` setup files — reuse them instead of re-implementing DB setup.

## Gotchas

- **Plain `*.spec.ts` files are orphaned.** vitest excludes them and Playwright only matches `*.e2e.spec.ts`; files like `amc-workflow.spec.ts` currently run in neither harness. If you need coverage, write a `.test.ts` (or rename to `.e2e.spec.ts`).
- `vitest.config.ts` computes its exclusion list at runtime: any `src/tests/*.test.ts` containing `process.exit(`, `node:test`, or lacking `describe/it/test(` is filtered out of vitest and handled by `run_legacy_tests.cjs` instead. That runner spawns each file with `npx tsx` and caps it at 25s per file.
- `npm run test:integration` currently targets a folder whose only file is `.deferred` — it **passes silently and proves nothing**. Don't cite it as evidence.
- The root `tests/` folder is excluded by vitest and sits outside Playwright's `testDir`; only the legacy runner reaches it.
- Unit tests need a live MySQL `wms_test` — an offline `npm run test:unit` will fail on setup, not on your assertion.

## Verifying a change

- Backend/logic change: `npm run lint` then `npm run test:unit` (or `test:components` for pure UI logic).
- Anything touching display data: `npm run lint:fabrication` — the same guard runs as `prebuild` and fails the build.
- Don't report a test as passing unless it actually ran and asserted something.
