# File Audit — DWIP Enterprise Platform

**Repo:** `remix-workshop-management-system` · v1.1.0-rc.1
**Date:** 2026-08-18
**Scanned:** 2,275 files outside `node_modules`/`.git`/`android`, against 2,034 git-tracked paths

---

## Headline

**Off track on wiring, not on volume.** The clutter cleaned up easily — 44 items and ~57 MB quarantined with zero risk. The real finding is underneath it: **17 API route modules in `src/api/routes/` are not imported by anything**, while at least six shipped UI components call the endpoints those modules define. Those calls 404 today. The go-live test that is supposed to catch exactly this asserts against a hardcoded array instead of the running app, so it passes regardless.

---

## At risk

### 1. Seventeen route modules are dead on arrival — UI already calls them

`server.ts` is a 10,458-line monolith declaring 173 API paths via 199 inline `app.get/post/...` handlers. There is **no `express.Router()` mount anywhere in it.** Meanwhile `src/api/routes/` holds 17 `*.routes.ts` files (~90 KB) that define routers nothing imports.

For most of them, `server.ts` has no inline equivalent either — so the endpoint simply does not exist:

| Namespace | UI callers | Inline handlers in `server.ts` | Result |
|---|---|---|---|
| `/api/qc` | `QCInspectorWorkspace.tsx` | 0 | **404** |
| `/api/platform` | `ApiLogsViewer.tsx`, `ExternalSystemsManager.tsx`, `IntegrationHealthDashboard.tsx` | 0 | **404** |
| `/api/pipeline` | `ReceptionistWorkspace.tsx`, `ManagerAssignmentWorkspace.tsx` | 0 | **404** |
| `/api/floor-execution` | `FloorSupervisorWorkspace.tsx` | 0 | **404** |
| `/api/sa-intake` | `SaTechnicalIntakeModal.tsx` | 0 | **404** |
| `/api/billing` | test only | 0 | dead module (17.7 KB) |
| `/api/parts`, `/api/hr`, `/api/ai`, `/api/analytics`, `/api/command-center`, `/api/devops`, `/api/vos`, `/api/gate-out` | varies | 0 | dead modules |

Only `breakdown`, `gate-out` and `warranty` have inline handlers in `server.ts`, and even those duplicate logic that also sits unused in `src/api/routes/`.

**Why it matters:** five operational workspaces — QC inspection, reception intake, manager assignment, floor supervision, and SA technical intake — are calling endpoints that were never mounted. Either these screens are broken in production, or they are unreleased and the route extraction was abandoned midway.

**Next action:** someone needs to decide, per namespace, whether the extracted router is the intended implementation. If yes, mount them (`app.use("/api/qc", qcRoutes)` etc.) and delete the inline duplicates. If no, delete `src/api/routes/` and fix the UI callers. Leaving both is the worst of the three.

### 2. The go-live verification test cannot fail

`src/tests/go-live-verification.test.ts:111–119`:

```ts
const apiRoutes = [
  "/api/workshop", "/api/billing", "/api/warranty",
  "/api/parts", "/api/hr", "/api/breakdown",
  "/api/ai", "/api/analytics"
];
assert(apiRoutes.length === 8, "/api mount point registers all 8 domain route controllers");
assert(apiRoutes.includes("/api/billing"), "/api/billing route is registered");
```

The assertion checks that a literal defined two lines above contains a string it was written to contain. It never touches the Express app. Seven of those eight namespaces are not registered.

The surrounding block also "simulates" the `/health` response by constructing the payload inline and asserting on it. The whole file is shaped like verification but tests only its own fixtures.

**Why it matters:** this is the artifact a go-live decision was signed against. A green run here means nothing about the deployed system.

**Next action:** replace the literal with a real assertion against the app — `supertest(app).get("/api/billing/...")` or inspect `app._router.stack`. Until then, treat the go-live certificate in `releases/v1.0.0-rc2.1/` as unverified.

---

## Silent

Commitments with no activity and no explanation.

| Item | Last touched | State |
|---|---|---|
| `wms-workshop/` | Jul 4 | A second, native Gradle Android project, tracked in git, alongside the live Capacitor `android/` build. 14 files, never referenced. Abandoned but never removed. |
| `routes/` (root, 18 files) | Jul 18 | Zero importers. Contains `customer_v1.routes.ts`, `customer_v2.routes.ts`, `customer.routes.ts` — three generations of the same file, all dead. |
| `server/` (`app.ts`, `state.ts`) | Aug 1 | Zero importers. Looks like the start of a `server.ts` decomposition that stopped. |
| `health/health.controller.ts` | Jul 14 | Zero importers. |
| `app/routes/api/app/routes/diagnostics.tsx` | Jun 30 | Path contains `app/routes/` twice — a copy-paste error that was committed and never noticed. Zero importers. |
| `monitoring/` | Jul 25 | Zero importers. |
| `DWIP/` and `Project/` | Jul 22 / Jul 10 | Two separate Python ETL projects with overlapping purpose. `DWIP/etl/src` has 40 modules; `Project/src` has 10. Both carried their own committed virtualenv. |
| `src/core/gateway/` | — | An entire subsystem — adapter, controller, orchestrator, four service classes, token manager and store, feature flags, error handler, v1 contracts — with no import path from any entrypoint. 15 files. |

`src/core/` overall has 14 unreferenced top-level modules including `scheduler.ts`, `queue-processor.ts`, `circuit-breaker.ts`, `dead-letter-queue.ts`, `escalation-engine.ts`, `timer-engine.ts` and `notification-queue.ts` — the kind of infrastructure whose absence from the import graph suggests it was built ahead of the thing meant to use it.

**Note on confidence:** reachability was computed by static import resolution from `server.ts`, `src/main.tsx`, `src/customer-portal/main.tsx`, all test files and all scripts. `server.ts` uses `await import()` in four places, all of which resolve to `src/core/workshop/*` and were followed. No `import.meta.glob`, `require.context`, or `readdirSync`-based loading exists anywhere in the codebase, so dynamic registration is not hiding these. Still — treat this as a list to review, not a list to delete.

---

## Structural notes

**Eight places documentation lives.** `docs/` (345 files), `archive/` (135), `releases/`, `production_audit/`, `architecture_audit/`, `review/`, `profiles/`, `.artifacts/`. `archive/reports/` and `releases/v1.0.0-rc2.1/` overlapped by 31 byte-identical files. Consolidating to `docs/` + `releases/<version>/` would remove the ambiguity about which report is current.

**Root-level dirs split the source tree.** `middleware/` and `config/` are genuinely live (14 and 16 importers respectively) and sit outside `src/` alongside five dead siblings. Moving the two live ones to `src/middleware/` and `src/config/` would let the rest of the root directories go without anyone having to check each one.

**`.env` sprawl.** Five env files; `.env.dev` and `.env.rc1` are 27 bytes each — effectively empty placeholders that the `build:dev` and `build:rc1` scripts depend on.

**Two 199 KB and 144 KB source files.** `src/components/JobCardManager.tsx` (199 KB) and `src/db/schema.ts` (144 KB), plus `server.ts` at 456 KB. Not a cleanup item, but these three files are where merge conflicts will concentrate.

---

## Cleaned up

44 items moved to `_quarantine/`, ~57 MB. Nothing deleted; every move is reversible and listed in `_quarantine/MANIFEST.md`.

| Category | Items | Notes |
|---|---|---|
| Local Python envs | 3 | `DWIP/.venv`, `Project/.venv` (~49 MB, untracked, byte-identical to each other), `__pycache__` |
| Duplicates | 32 | 31 files from `archive/reports/` identical to `releases/v1.0.0-rc2.1/`; one timestamped backup dir |
| Generated test artifacts | 2 | `test-results/`, `playwright-report/` — both already gitignored |
| Scratch / one-off | 7 | Including `dev/null` — a 7.1 MB file created when a script ran `> /dev/null` on Windows, where that device does not exist |

`_quarantine/` was added to `.gitignore`.

**Left alone deliberately:** `dist/` (8 MB, regenerable, but `npm start` runs from it), all `.env*` files, `db_schema.txt`, `bucket_iam_backup.json`, and every tracked source file.

---

## On track

975 files in `src/` with 882 reachable from an entrypoint — an 84% live rate, which is healthy for a platform this size. Build tooling, test infrastructure, Drizzle migrations and the Capacitor Android target are all wired correctly and current.

---

## Sources

| Checked | Result |
|---|---|
| Filesystem walk, 2,275 files | Complete |
| `git ls-files` — 2,034 tracked paths | Complete |
| MD5 comparison of 834 size-colliding files | Complete — 140 duplicate groups, 167 redundant copies |
| Static import graph, 1,054 code files from 178 entrypoints | Complete |
| `.gitignore` cross-reference | Complete |
| **`git status` / `git log`** | **Failed** — timed out repeatedly against the mounted Windows filesystem. Uncommitted work in the tree was therefore not assessed, and the "last touched" dates above are filesystem mtimes, not commit dates. |
| `android/` (907 files, 310 MB) | **Not analyzed** — excluded to keep the scan inside its time budget. It is a Capacitor build target and largely generated, but it was not verified as such. |
