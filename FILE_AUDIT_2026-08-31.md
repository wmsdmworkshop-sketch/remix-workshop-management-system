# File Audit — DWIP Enterprise Platform (cleanup pass 2)

**Repo:** `remix-workshop-management-system` · v1.1.0-rc.1
**Date:** 2026-08-31
**Predecessor:** `FILE_AUDIT_2026-08-18.md` (44 items quarantined)
**This pass:** 53 items quarantined (~58 MB) — 46 untracked scratch files, 5 dead directories, 1 abandoned Android project.
**Nothing deleted.** Every move is reversible; full manifest in `_quarantine/MANIFEST.md`.

---

## Removed this pass

### 1. Untracked Siebel/TMSA scratch files — 46 files (~0.2 MB)

One-off exploration artifacts from the Tata Motors Siebel eDealer / TMSA integration, sitting in `scripts/`:

- **20 `.ts` debug/test harnesses** — `discover_*.ts`, `test_tmsa_*.ts`, `test_siebel_*.ts`, `query_*.ts`, `fetch_one_siebel_vehicle.ts`, `ingest_ap05tb4993.ts`, `sample_vehicles.ts`, `show_both_results.ts`, `trigger_mass_sync.ts`, `find_mh12yq4728.ts`, `inspect_siebel_view.ts`, `test_live_login.ts`, `test_chassis_lookup.ts`, `test_prod_lookup.ts`, `test_fetch_content_frame.ts`, `test_tata_mobile_gateways.ts`, `test_all_devanand_sa.ts`, `test_vehicle_passport_lookup.ts`.
- **26 `.html` captured page frames** from the Siebel portal — `siebel_*.html`, `session_*.html`, `vehicle_*.html`, `all_vehicles_view.html`, `live_view.html`.

All were **untracked by git** (no history affected) and unreferenced by any source file, test, or build config. Moved to `_quarantine/2026-08-31/scratch-siebel-tmsa/`.

### 2. Dead alternate-server subsystem — 5 directories, 23 files

The **unmounted alternate Express server** and everything that only it referenced. `server.ts` (the live 10,458-line monolith) states this logic was "ported verbatim" from `server/app.ts` (comment above `/api/v1/pilot/setup`), so the subsystem has zero reachability from any entrypoint.

| Moved | Contents | Evidence |
|---|---|---|
| `routes/` | 18 files — `index.ts`, `customer/` (3 generations: `customer.routes` / `customer_v1` / `customer_v2`), `fleet/`×2, `graph/`×2, `passport/`×2, `cxo`, `devops`, `health`, `master`, `observability`, `pilot`, `pilot_customer`, `warranty` | Router tree mounted **only** by `server/app.ts` |
| `server/` | `app.ts`, `state.ts` | Alternate Express app; imports `../routes/index.ts`; never mounted |
| `health/` | `health.controller.ts` | Imported only by dead `routes/health.routes.ts` |
| `monitoring/` | `check-password.js` (one-off bcrypt check), `cloudrun-dashboard.json` (referenced only in docs) | Zero code importers |
| `app/` | `routes/api/parse-diagnostics.tsx`, `routes/api/app/routes/diagnostics.tsx` | Leftover Remix layout; nested `app/routes/` twice is a committed copy-paste error; not in any build config |
| `scripts/api_server.ts` | Mock server script | Exists only to run `server/app.ts` (`import { app } from "../server/app.ts"`); moved alongside the subsystem it served |

Verified: zero imports from `src/`, `server.ts`, tests, `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`. `tsconfig.json` includes only `src/**/*` + `server.ts`, so none of these were compiled.

Moved to `_quarantine/2026-08-31/dead-server-subsystem/`. Restore with `git checkout -- routes server health monitoring app scripts/api_server.ts`.

### 3. Abandoned Android project — `wms-workshop/` (676 files, ~57 MB)

Second native Gradle Android project (`app/`, Gradle wrapper, stray `app.lnk` shortcut) alongside the live Capacitor `android/` build. Tracked in git, never referenced by any config/source/script. First flagged 2026-08-18; moved now.

Moved to `_quarantine/2026-08-31/wms-workshop/`. Restore with `git checkout -- wms-workshop`.

---

## Verification

- `npx tsc --noEmit` — only **6 pre-existing errors** in `src/engines/vehicle-passport/index.ts` (SLA/status string-literal and part-array type mismatches). **Zero** errors related to the moved files.
- `git status` — 73 deletions (all intended moves) + 1 pre-existing modification (`src/services/tmsa-siebel-live-client.service.ts`). No new untracked files.
- No dangling imports of any moved path remain in `src/`, `server.ts`, tests, or build configs.

---

## Left alone (with reasons)

| Item | Reason |
|---|---|
| `DWIP/`, `Project/` | Tracked Python ETL projects; overlapping purpose but separate workstreams — removing tracked code risks an in-progress refactor. **Review before deciding.** |
| `src/core/gateway/` + 14 unreferenced `src/core/` modules | Flagged 2026-08-18; treated as review list, not delete list. |
| `dist/` (~35 MB) | Build output; `npm start` runs `node dist/server.cjs`. Regenerable with `npm run build`. |
| `.env*`, `src/db/.env` | Live configuration and secrets. |
| `archive/`, `releases/`, `production_audit/`, `architecture_audit/`, `review/`, `profiles/`, `scratch/` | Tracked project history / documentation. |
| `monitoring` docs references | `deployment/*.md` still cite `server/app.ts` CORS origin; docs are historical, not code. |

---

# Pass 3 — 2026-08-31: project folder = linked & working only

**Request:** keep only linked and working files; archive the rest.
**Decision:** `src/` kept entirely as-is (owner choice — avoids risk to in-progress refactors). All non-linked project-root material archived to `_quarantine/2026-08-31b/`.

## Archived (~830 items, categorized)

| Category | Contents |
|---|---|
| `project-docs/` | `docs/` (345 files, ~15 MB) — not served by the app |
| `project-history/` | `archive/`, `releases/`, `production_audit/`, `architecture_audit/`, `review/`, `profiles/`, `scratch/` |
| `python-etl/` | `DWIP/` (186), `Project/` (23) |
| `oneoff-scripts/` | `maintenance/` (17) + 56 of 57 `scripts/*` — **only `sync_now.ts` kept** (referenced by `npm run dev/pilot/production`) |
| `store-and-assets/` | `store-assets/`, `assets/`, `.artifacts/` |
| `tooling/` | `.agents/`, `.claude/`, `.idea/`, `.vscode/` |
| `data-backups/` | `workshop_db.json`, `db_schema.txt`, `bucket_iam_backup.json`, `metadata.json`, `firebase-applet-config.json` |

## Side changes

- `Dockerfile`: removed `COPY --from=builder /app/docs ./docs` (docs folder no longer exists; was never served — verified `server.ts` has no `/docs` static mount).

## Kept

`src/`, `server.ts`, `config/`, `middleware/`, `public/`, `android/`, `dist/`, `drizzle_mysql/`, `test-infra/`, `tests/`, `scripts/sync_now.ts`, `deployment/`, all build/deploy configs, `.env*`, `index.html`, `customer-index.html`, `firestore.rules`, `version.json`, `README.md`, audit files.

Full restore commands in `_quarantine/MANIFEST.md` §8.
