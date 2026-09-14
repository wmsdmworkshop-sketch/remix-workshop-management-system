---
name: "DWIP Backend Instructions"
description: "Use when adding or changing Express routes, API endpoints, controllers, services, engines, RBAC/auth checks, database access, or SQL/TypeScript migrations in the DWIP server. Covers route mounting, closure-local auth helpers, raw mysql2 access and the dual migration systems."
applyTo: ["server.ts", "src/api/**", "src/core/**", "src/engines/**", "src/services/**", "src/integrations/**", "src/db/**", "src/workflows/**", "src/workshop/**", "src/middleware/**", "middleware/**", "config/**", "drizzle_mysql/**"]
---

# DWIP Backend

Global rules and commands live in [AGENTS.md](../../AGENTS.md) and the binding [.agents/AGENTS.md](../../.agents/AGENTS.md) constitution. This file covers backend-specific mechanics.

## Adding an API endpoint

1. Put new domain logic in `src/api/routes/<domain>.routes.ts` — export either a `Router` or a `createXRouter(deps)` factory. **Do not add new business logic to `server.ts`** (EAR-001 Rule 4). The only acknowledged exception is `src/engines/ai-brains/*`, mounted inline on purpose.
2. **Mount it in `server.ts`** (see the mount block around the pipeline/floor/qc/billing routers). Un-mounted router files are dead code — ~9 of the 15 files in `src/api/routes/` are currently never imported.
3. `authenticateToken`, `requireRoles` and `requirePermission` are **closure-local `const`s inside `server.ts`, not exported**. A modular router receives them via a factory (`createXRouter({ authenticateToken, requireRoles, requirePermission })`), or uses `authenticateJwt` from `src/api/middleware/auth.ts` with inline role checks.

## Auth & RBAC

- There is a global `/api` guard forcing `authenticateToken` on every path except `PUBLIC_API_PATHS` (auth, `/api/media`, `/api/customer/*`, `/api/v1/devops/cron/*`, `/ws/`). A second guard blocks all writes for observer roles. **Never assume a new route is public** — and never widen `PUBLIC_API_PATHS` to make something work.
- `requireRoles` matches **normalised** role names (lowercase, space ≡ underscore) because `user_role` stores human titles like `"Service Advisor"`.
- `requirePermission(module, action)` is DB-driven: `RoleService.hasPermission` → `PermissionRepository` → the `role_permissions` table (`can_view`/`can_edit`/`can_comment`, keyed by `role_name` + `module_name`; modules seeded in `modules_master`). The `developer` role bypasses it.
- Field-level rules live in `field_permissions` (`role`, `workflow_stage`, `field_name`, `permission_level`), enforced by `src/core/security/field-permissions.ts` with a 60s cache.
- `authenticateToken` re-reads role and `is_active` from `user_access_master` on every request. New account-linking endpoints follow the `/api/users` convention: `requirePermission("User Management", "edit")`.
- Background/Cron: `/api/v1/devops/cron/*` is authenticated by Google OIDC + an `x-cloudscheduler` header, **not** by app JWT. Don't swap it for `authenticateToken`.

## Database

- Primary access is **raw `mysql2/promise`** via the `pool` exported from `src/db/index.ts` (a Proxy adding retry/telemetry); imported as `dbPool` in `server.ts`. Use parameterised queries.
- Drizzle is installed and configured (`src/db/schema.ts`) but used in only a few places (`src/core/policy-engine.ts`, `src/core/vos/repositories/Drizzle*`). Follow the surrounding file's style; don't migrate a raw-SQL module to Drizzle opportunistically.
- `src/config/env.ts` validates the environment before pooling.

### Two migration systems — pick the right one

| | Raw SQL | TypeScript |
| --- | --- | --- |
| Location | `drizzle_mysql/NNNN_name.sql` | `src/db/migrations/NNN_name.ts` |
| Companion files | `NNNN_name_rollback.sql`, often `NNNN_name_verify.sql` | — |
| Registered in | (none — applied externally) | `src/db/migrations/index.ts` (`allMigrations`) |
| Run by | deploy/migration tooling | `runMigrations()` at boot (`server.ts`) |

- Forward SQL files must be idempotent (`CREATE TABLE IF NOT EXISTS`); rollbacks use `DROP ... IF EXISTS`. Always ship the rollback alongside the forward migration.
- New TS migrations must be imported **and** added to the `allMigrations` array, or they never run.

## Pitfalls

- **`job_card_master` has `live_status`, not `workshop_stage`.** Any bridge write targeting `workshop_stage` on that table fails silently (usually swallowed by a best-effort try/catch). Only the `job_cards` table carries `workshop_stage` directly.
- **`job_cards` is nearly empty in production**; the real data is in `job_card_master`, surfaced to the in-memory model via `syncLoad()`. Direct SQL against `job_cards` from engine code will see almost nothing.
- WebSockets are attached to `/api/live` (staff voice — currently refuses, no real-time provider) and `/api/customer/live-progress` (customer JWT from `CUSTOMER_JWT_SECRET`).
- Prefer the shared engines (`src/core/workshop/*`, `WorkflowEngine`, `ApprovalEngine`, `NotificationEngine`) over re-implementing a state transition or validation.

## Before you finish

- `npm run lint` (type gate) and `npm run lint:fabrication` (real-data guard). The guard also runs as `prebuild`.
- A legitimate match for a fabrication rule needs a trailing `// realdata-allow` with a short reason — never silence it by rewriting the rule.
- New user-facing metrics must come from live records, not literals.
