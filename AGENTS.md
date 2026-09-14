# AGENTS.md — DWIP Enterprise Platform

Workshop management system for a Tata Motors commercial-vehicle dealership: gate-in → reception → job card → bay/technician allocation → QC → billing → gate-out, plus HR/admin, reporting, a separate customer portal, and a Capacitor mobile shell.

**Stack:** TypeScript · Express monolith (`server.ts`) · React 19 + Vite + Tailwind v4 · MySQL via `mysql2` (Drizzle for a few modules) · Vitest + Playwright · Google Cloud Run.

## Read first

- **[`.agents/AGENTS.md`](.agents/AGENTS.md)** — the binding DWIP "constitution" (EAR-001 rules, refactoring policy, model routing) plus a dated **session handover log** of live incidents, business rules and known gaps. Read it before any non-trivial change; it frequently explains *why* the code looks the way it does.
- [README.md](README.md) · [deployment/DEPLOY_DWIP_ENTERPRISE.md](deployment/DEPLOY_DWIP_ENTERPRISE.md) (**authoritative deploy runbook**) · [deployment/ENVIRONMENT_VARIABLES.md](deployment/ENVIRONMENT_VARIABLES.md) · [docs/CHANGELOG.md](docs/CHANGELOG.md) · [docs/releases/](docs/releases/)

> **Stale links warning:** several paths referenced inside `.agents/AGENTS.md` (`docs/DOCUMENT_INDEX.md`, `docs/architecture/EAR-001_*`, `docs/11_Deployment_Guide.md`, `docs/Database/DWIP-DB-001.md`, `scripts/post_deployment_handover.ts`) were archived to `_quarantine/` in the 2026-08-31 cleanup and **no longer exist**. Trust the links in this file.

## Commands

| Goal | Command | Notes |
| --- | --- | --- |
| Install | `npm install` | |
| Dev server | `npm run dev` | Port comes from `PORT` in `.env` (currently **8080**; `.env.example` says 3001). Runs `scripts/sync_now.ts` first — **requires a live, reachable DB**; fails offline. |
| Type gate | `npm run lint` | Same as `npm run type-check` (`tsc --noEmit`). |
| Build | `npm run build` | Staff SPA + customer SPA + esbuild bundle → `dist/server.cjs`. |
| RC build | `npm run build:rc1` | This is the mode `deployment/Dockerfile` deploys. |
| Real-data guard | `npm run lint:fabrication` | Also runs automatically as `prebuild` — a failure there is intentional. |
| Provision test DB | `npm run db:setup:test` | Run once. Creates isolated `wms_test`; fails closed if env is wrong. |
| Unit tests | `npm run test:unit` | Needs `wms_test` (MySQL). |
| Component tests | `npm run test:components` | jsdom, **no DB by design**. |
| Legacy tests | `npm run test:legacy` | Custom `tsx` runner for files vitest skips. |
| E2E | `npm run test:e2e` | No `webServer` block — start the server yourself first. |
| Everything | `npm test` | unit + legacy + integration. |

## Architecture — where things live

Layering is enforced by convention: **Routes/Controllers → Services → Shared Engines → Repositories/DB**.

- `server.ts` — the live Express monolith (~15k lines). All primary app routes are registered **inline** here.
- `src/api/routes/<domain>.routes.ts` — modular routers; a route file does nothing until it is mounted in `server.ts`.
- `src/core/` — the real service layer: `identity.ts` (`RoleService`, `EmployeeIdentityService`, `AuditService`), `repositories.ts`, `workflow/`, `security/field-permissions.ts`, and the domain engines in `core/workshop/` (floor-execution, qc-execution, billing, realtime-ownership-pipeline).
- `src/engines/` — AI/OCR/aggregation: `ocr-processor.ts`, `deepseek-engine.ts`, `vehicle-passport/`, `ai-brains/`, `tmsa-mass-sync-worker.ts`.
- `src/components/` — React screens (~113 files). `*Workspace.tsx` = role console, `*Manager.tsx` = CRUD, `*Panel.tsx` = embedded panel.
- `src/App.tsx` — app shell, role→tab mapping and the flat `activeTab === "x" && <Component/>` render chain. `src/lib/tabRoutes.ts` owns tab↔URL mapping.
- `src/db/` — MySQL pool (`index.ts`), `sync.ts`, TS migration runner. `drizzle_mysql/` — raw SQL migrations.
- `tools/` — repo tooling (deliberately **not** `scripts/`, which `.dockerignore` excludes). `test-infra/` — test DB provisioning. `deployment/` — Cloud Run/Docker/PM2. `_quarantine/` — archived files.

## Non-negotiable rules (EAR-001)

Full rationale in [`.agents/AGENTS.md`](.agents/AGENTS.md).

- **Real data only.** No fabricated metrics, mock arrays, invented scores, or fake success messages. `tools/no-fabricated-data.mjs` blocks the build on known fabrication patterns; a legitimate exception needs a trailing `// realdata-allow` **with a reason**.
- **No fallback identities.** Never hardcode a user id, role, name, or placeholder person (`UNKNOWN_TECH`, `SYSTEM_ADMIN`, etc.) when the authoritative lookup is empty — surface an honest empty state instead.
- **Single source of truth / capture once, reuse everywhere.** Master and transactional data live in exactly one place; state-machine transitions and validation belong in the shared engines, never duplicated in UI and API layers.
- **Layered modularity.** Do not add new business logic to `server.ts`. (One acknowledged, documented exception: `src/engines/ai-brains/*` mounted inline.)
- **RBAC is enforced server-side** at both the API route and the workflow engine. Client-side role checks are cosmetic.
- **Test isolation.** Never point tests at a dev/prod database; the destructive-test guard fails closed by design.
- **Business semantics over code similarity.** Never delete, merge, or consolidate business logic just because two files look alike — prove the workflows, state machines and approval matrices are identical first.
- **Never hard-delete files.** Move them to `_quarantine/<date>/` (gitignored, reversible) and update `_quarantine/MANIFEST.md`. See `/memories/repo/cleanup-conventions.md`-equivalent notes in [_quarantine/MANIFEST.md](_quarantine/MANIFEST.md).

## High-cost pitfalls — check before you write

- **`job_card_master` has `live_status`, not `workshop_stage`.** Writes to `workshop_stage` on that table fail silently. `syncLoad()`/`saveJobCardsToMaster` map between them at the sync boundary; only the `job_cards` table carries `workshop_stage`. Real production data lives in `job_card_master`; the `job_cards` table is nearly empty.
- **Most routers are not mounted.** Only ~6 of the 15 files in `src/api/routes/` are wired into `server.ts`; the rest are dead code. Mount explicitly, or the route 404s.
- **Auth helpers are closure-local in `server.ts`.** `authenticateToken` / `requireRoles` / `requirePermission` are not exported — new modular routers take them via a `createXRouter(deps)` factory (see `src/api/routes/ai.routes.ts`).
- **`excludedTabs` is duplicated in `src/App.tsx`** (a redirect guard *and* a render filter). In `rc1` builds it hides tabs from **everyone including `developer`**. Change both occurrences or neither.
- **Every `/api` path requires auth** unless listed in `PUBLIC_API_PATHS`. Only a **401** means expired session — a 403 must not log the user out.
- **`src/config/api.ts` must stay the first import** in the staff SPA entry; it patches `window.fetch` for the Capacitor build.
- **`*.spec.ts` files are orphaned** unless they end in `e2e.spec.ts` — vitest excludes them and Playwright only picks up `*.e2e.spec.ts`.
- **The production database is Google Cloud SQL — "railway" is only a legacy *name*.** The production schema is still called `railway` (a fossil from the app's original Railway.app hosting) and both logs and docs still say "Railway MySQL" (`server.ts`, `src/db/sync.ts`, most of `deployment/*.md`). Don't be misled, and don't rename it casually — `src/config/env.ts` and the destructive-test guard denylist that exact string as the production identity.
- **Most `deployment/*.md` describe a topology that was never deployed.** `dwip-pilot`, `dwip-prod`, `dwip-images`, `dwip-cloudrun-sa` and the `wms-workshop-app` service are GCP-001 planning artifacts. Production is the single service **`dwip-enterprise`** (project `giga-course-dp497`, region `asia-south1`, domain `devanand.aivaahan.com`); the live pipeline is `deployment/cloudbuild.yaml` + `deployment/Dockerfile`. Superseded docs carry a warning banner.
- **`/api/ready` and `/api/metrics` do not exist.** Only `GET /api/health` (plus `/api/system/health-gateway`) is registered in `server.ts`, despite several docs citing the other two as probes.
- **The app's DB account is `root`, holding Cloud SQL's broad `cloudsqlsuperuser` role** (`*.*` `WITH GRANT OPTION`, incl. `CREATE USER`). The unused `dwipadmin` superuser was dropped on 2026-09-14, so `root` is now the only application account. The app's boot path runs real DDL every start (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE`, `CREATE INDEX`, `CREATE OR REPLACE VIEW`), so any replacement user needs DDL on the `railway` schema — a scoped alternative is proposed in [deployment/DATABASE_USERS.md](deployment/DATABASE_USERS.md).
- **Deploy with `deployment/Dockerfile`**, not the root `Dockerfile` (wrong Node/port/build). Deploys are image-only: never add `--set-env-vars`, or live DB/JWT secrets are lost.
- **`public/downloads/*.apk` are static files** — no build regenerates them.
- **`scripts/sync_now.ts` needs a live DB** and runs before both `dev` and `start`.
- **Windows:** `> /dev/null` creates a real `dev/null` file (`.gitignore` has `dev/` for it).

## Where new code goes

| Change | Location |
| --- | --- |
| API endpoint | `src/api/routes/<domain>.routes.ts` (export a `Router` or `createXRouter(deps)`) **and mount it in `server.ts`** |
| Business rule / engine | `src/core/workshop/` or `src/core/` — never inline in `server.ts` |
| SQL migration | `drizzle_mysql/NNNN_name.sql` + `NNNN_name_rollback.sql` (forward files idempotent: `CREATE TABLE IF NOT EXISTS`) |
| TS migration | `src/db/migrations/NNN_name.ts`, then register in `src/db/migrations/index.ts` |
| React screen | `src/components/<Name>Workspace.tsx`, add the tab to `src/App.tsx` (`ROLE_TABS`, render chain) and `src/lib/tabRoutes.ts` |
| Field-level permission rule | `src/core/security/field-permissions.ts` (`field_permissions` table) |
| Version/release notes | `version.json` + [docs/CHANGELOG.md](docs/CHANGELOG.md) |

## Area-specific instructions

`.github/instructions/` holds focused guidance for backend, frontend and test work — it loads automatically when you touch matching files.
