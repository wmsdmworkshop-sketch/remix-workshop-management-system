# DWIP Enterprise Reference Architecture (EAR-001)

**Status:** APPROVED & FROZEN
**Version:** 1.0 (EAR-001)
**Scope:** DWIP Enterprise Codebase & Cloud Environment
**Effective Date:** 2026-07-20

> [!IMPORTANT]
> **GOVERNING DOCUMENT**
> This document is the absolute authority on the DWIP Enterprise Architecture. Every future feature, migration, schema change, API, workflow, or UI must explicitly reference the relevant section of EAR-001 before implementation. Any violation of these principles requires a formal architectural override.

## 1. The DWIP Constitution
Every implementation must strictly adhere to:
- **Single Source of Truth:** Data must live in exactly one definitive location.
- **Capture Once, Reuse Everywhere:** Business rules and validations are defined once in an Engine or Domain layer and injected where needed.
- **Zero Duplicate Masters:** No duplicating configuration, users, roles, or lookup tables across different database schemas or hardcoded logic.
- **Modular Architecture:** Monolithic code (e.g., legacy `server.ts`) is strictly banned. Code must adhere to layered abstractions (Routes -> Controllers -> Services -> Engines -> Repositories).
- **Enterprise Scalability:** The system must horizontally scale across Cloud Run instances for multiple Tata Motors Commercial Vehicle dealerships seamlessly.

## 2. Final Repository Tree (`tmcv-dwip-enterprise`)
```text
dwip-enterprise/
├── docs/                     # Canonical documentation
│   ├── business/
│   ├── architecture/         # Location of EAR-001
│   └── api/
├── config/                   # Global config (Vite, TS, Env mapping)
├── deploy/                   # IaC, Dockerfiles, Cloud Build
├── scripts/                  # Official automation & diagnostic tools
├── backend/                  # Layered Backend API
│   ├── api/                  # Express routes and controllers
│   ├── services/             # Orchestration logic
│   ├── repositories/         # Drizzle I/O layer
│   ├── engines/              # Shared logic (Workflow, Approval, Notification)
│   └── middleware/           # Interceptors (Auth, Role Guard)
├── frontend/                 # React SPA
│   ├── pages/                # High-level routes
│   ├── dashboards/           # Specialized UI (WorkshopManager, Technician)
│   ├── features/             # Domain modules
│   └── shared/               # Shared components, hooks, contexts
├── database/                 # Cloud SQL source of truth
│   ├── schema/
│   ├── migrations/
│   └── seeds/
├── tests/                    # E2E, Unit, Integration, UAT
└── archive/                  # Immutable storage (Excluded from build)
```

## 3. Database Architecture (Cloud SQL - MySQL)
- **Engine:** Drizzle ORM configured exclusively for MySQL (`mysql2`).
- **Master Data:** Absolute normalization. `users.role_id` must map to `roles.role_id`. `employees` must map to `workshops`.
- **Transaction Data:** `job_cards`, `invoices`, `gate_entries`.
- **Schema Management:** All schema mutations must produce an idempotent migration file stored in `database/migrations/`. 
- **Legacy Systems:** PostgreSQL (`drizzle/`) and Railway remnants are officially deprecated and ignored by the production build.

## 4. Shared Engines (`backend/engines/`)
To achieve *Capture Once Reuse Everywhere*, logic must be centralized into autonomous Engines:
- **Workflow Engine:** Computes legal state transitions and queue management.
- **Notification Engine:** The sole orchestrator of outbound communications (WebSockets, SMS, Email). 
- **Approval Engine:** Manages hierarchical approval matrices (Goodwill, FSB, Warranty).
- **Permission & Role Engine:** Validates capabilities against `RoleMaster` definitions. Hardcoded string matching (`role === "Service Advisor"`) is **strictly forbidden**.
- **Audit Engine:** Immutable ledger for security events, transition overrides, and access modifications.

## 5. API and Service Layer
- Controllers must **not** execute business rules; they parse requests, validate via Zod, and return HTTP responses.
- Services handle domain logic.
- Repositories handle all SQL queries. Controllers and Services may not import `drizzle` directly.

## 6. Frontend Guidelines
- **Framework:** React + Vite.
- **Routing:** Must be cleanly decoupled; avoid `App.tsx` bloat.
- **UI Kit:** Shadcn UI embedded in `frontend/shared/components`. Custom CSS is minimized in favor of Tailwind utility classes.
- **State:** Centralized contexts (`shared/contexts/`) for Identity, Theme, and global UI state. Feature state should be localized.

## 7. Execution and Migration Workflow
All migrations from legacy structures to EAR-001 must follow this phased approach:
1. **Scaffold:** Create the EAR-001 directory structure.
2. **Move:** Transfer code without refactoring (Strangler Fig pattern).
3. **Refactor:** Standardize against the Engines and Repositories.
4. **Verify:** Prove via `npm run test` and `npm run build`.

---
*End of Document. By establishing EAR-001, we transition from an experimental UAT codebase to a permanent, enterprise-grade foundation for Tata Motors Commercial Vehicles.*
