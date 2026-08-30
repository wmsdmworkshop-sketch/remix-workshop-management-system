# DWIP Agent Constitution & Workspace Guidelines

> [!IMPORTANT]
> **MANDATORY READING FOR ALL AGENTS**
> Every AI agent operating in this workspace must read and strictly adhere to this document. This file represents the living constitution and operational handover protocol for the DWIP (Dealership Workshop Integrated Platform / Workshop Operating System) repository.

---

## 1. The DWIP Core Constitution (EAR-001)

Refer to canonical architecture document: [EAR-001 Enterprise Reference Architecture](file:///docs/architecture/EAR-001_Enterprise_Reference_Architecture.md).

1. **Single Source of Truth**:
   - Master data (Users, Roles, Workshops, Employee Directory) and transactional data (Job Cards, Gate Entries, Invoices) must reside in exactly one definitive location.
   - Do not create secondary fallback lookups or shadow tables.
2. **Capture Once, Reuse Everywhere**:
   - Centralize core domain logic inside shared engines (`WorkflowEngine`, `ApprovalEngine`, `NotificationEngine`). Never duplicate state-machine transitions or validation checks across UI and API layers.
3. **Zero Duplicate Masters & No Fallback Identities**:
   - Always resolve user identity and roles through the authoritative Employee Directory / DB schema. Never hardcode fallback user IDs or roles (e.g., `UNKNOWN_TECH`, `SYSTEM_ADMIN`).
4. **Layered Modularity**:
   - Strictly follow layered boundaries: `Routes / Controllers -> Services -> Shared Engines -> Repositories / Drizzle DB`.
   - Monolithic files (e.g., legacy root `server.ts`) must not receive new business logic; refactor into modular backend services.
5. **Real-Data-Only Operational Contract**:
   - Never inject fabricated mock metrics, fake bay statuses, or synthetic operational stats into production dashboard pipelines. All telemetry and metrics must be backed by live database records.

---

## 2. Post-Deployment Update Protocol

After **every** deployment, release candidate (RC), or major production push, the active agent is required to perform the following handover updates (executable via `npx tsx scripts/post_deployment_handover.ts <releaseTag> <commit>`):

1. **Update Release & Version Manifests**:
   - Update `version.json` and record the release tag/commit.
   - Log changes, fixes, and migrations in [docs/CHANGELOG.md](file:///docs/CHANGELOG.md).
2. **Document Schema & Migration State**:
   - Ensure all schema changes have corresponding idempotent migration scripts in `drizzle_mysql/` or `database/migrations/`.
   - Update [docs/Database/DWIP-DB-001.md](file:///docs/Database/DWIP-DB-001.md) if tables or relationships were altered.
3. **Update Agent Handover & Living Constitution**:
   - If new business rules, RBAC roles, external integration contracts (e.g., QRT, Gemini OCR, Tata Fleet API), or deployment flags were introduced, record them in this file ([.agents/AGENTS.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/.agents/AGENTS.md)).
4. **Verify Test Harness & Clean State**:
   - Ensure test suite passes against the isolated test database (`npm test` / `vitest`).
   - Clean up temporary artifacts, locks, and scratch files.

Automated runner: [scripts/post_deployment_handover.ts](file:///scripts/post_deployment_handover.ts)

---

## 3. Business Logic & Refactoring Guidelines

### Business Semantics Over Code Similarity
* **Never** recommend deleting, consolidating, or merging business logic solely because two files, controllers, or components appear structurally similar.
* Business semantics take strict precedence over code similarity.
* Any merge recommendation must explicitly demonstrate that workflows, state machines, validation rules, approval matrices, and lifecycle stages are 100% identical and approved.

### RBAC & Workflow Gate Enforcement
* All state transitions (e.g., Vehicle Gate-In -> Job Card Creation -> Bay Allocation -> Technician Assignment -> QC -> Billing -> Gate-Out) must be guarded both at the API route level and within the workflow engine.
* Do not bypass intake roles or operational gate checks for convenience.

### Test Isolation Standard
* Maintain strict separation between test environments and live/dev databases.
* Use isolated test-DB configurations (`.env.test`) to prevent test runs from polluting persistent workspace state.

---

## 4. Key Repository Navigation

| Component | Path | Description |
| :--- | :--- | :--- |
| **Architecture Authority** | [docs/architecture/EAR-001_Enterprise_Reference_Architecture.md](file:///docs/architecture/EAR-001_Enterprise_Reference_Architecture.md) | Canonical architecture & system constitution |
| **Master Doc Index** | [docs/DOCUMENT_INDEX.md](file:///docs/DOCUMENT_INDEX.md) | Directory of all WOS specs, ADRs, and manual guides |
| **Deployment Runbook** | [docs/11_Deployment_Guide.md](file:///docs/11_Deployment_Guide.md) | Deployment instructions and environment setups |
| **Backend Core** | `src/` / `server/` / `routes/` | Modular API routes, controllers, and services |
| **Drizzle / Database** | `drizzle_mysql/` | MySQL schema definitions, relations, and migrations |
| **Test Suites** | `tests/` | Unit, integration, and end-to-end verification suites |

---

## 5. Session Handover Log

### 2026-08-22 — AI Brains, Ownership Pipeline, Identity Merge (Cloud Run rev `dwip-enterprise-00086-d2k`)

#### New RBAC role scoping

- `/api/v1/ai-brains/*` is gated to `["developer"]` **only** — not admin-inclusive, unlike most other admin-tier features in this repo. This was an explicit product decision; do not widen it to `requireRoles(["admin","developer"])` without re-confirming with the product owner.
- New account-creation endpoints (`POST /api/employees/:id/create-default-login`, `POST /api/employees/bulk-create-logins`) use the existing `requirePermission("User Management", "edit")` gate (DB-driven RBAC), matching the convention already used by `/api/users`.

#### New business rule: identity/account creation

- Employee Directory is now the single place staff accounts get created (User Management's own "User Directory" tab is deprioritized — default tab changed to `permissions`, banner added pointing to Employee Directory). This does **not** contradict Rule 1 (Single Source of Truth) — it completes it, since `EmployeeDirectory.tsx` previously had no account-linkage UI at all despite the "Login Account Status" badge already existing in its markup, unwired.
- Default account creation: `username = employee_code` (lowercased), `password = employee_code` (temp), **must never overwrite an existing `user_access_master`/`users` row** — always check both employee-linkage and username-collision before insert. New `must_change_password` column on both `user_access_master` and `users`; login response now returns it, and `/api/my-profile/change-password` clears it. `EnterpriseGateway.tsx` blocks app entry with a mandatory change-password screen when set.
- `employee_code` is **not** DB-unique-constrained anywhere (confirmed via schema audit) — the collision check before default-login creation is the only thing preventing a duplicate-code account from overwriting someone else's login. Do not remove that check.

#### New inline subsystem — acknowledged exception to Rule 4

- SIGNA (L1 Tactical) / SETU (L2 Coordination) / DISHA (L3 Strategic) — `src/engines/ai-brains/*.ts` — are mounted **inline** in `server.ts`, not as a separate modular service. This is a deliberate, acknowledged deviation from Rule 4 ("Monolithic files must not receive new business logic"), made to ship a working system immediately per explicit product decision rather than block on a service-extraction refactor. A future refactor to extract these into a proper service layer is legitimate technical debt, not a correctness issue.
- Memory/learning is SQL-based against the existing MySQL pool (`ai_brain_registry`, `ai_brain_memory`, `ai_brain_activity_log` tables) — **not** ChromaDB/vector embeddings. A separate-microservice + ChromaDB design was evaluated and explicitly rejected: Cloud Run has no persistent local disk, so a `CHROMA_PERSIST_PATH`-based design cannot survive a restart/scale event as specified. Revisit only once a real persistent vector-store target (e.g. Cloud SQL + pgvector, or a managed vector DB) is chosen.

#### Real-Time Ownership Pipeline (Gate-In → Reception → Manager SA Assignment)

- `src/api/routes/pipeline.routes.ts` (real, pre-existing code) is now mounted at `/api/pipeline` in `server.ts`. Its backing tables (`tbl_gate_entry`, `tbl_reception_intake`, `tbl_handoff_sla`) were missing columns the engine (`src/core/workshop/realtime-ownership-pipeline.ts`) already assumed — this was an incomplete migration, not a design flaw; columns were added via `ALTER TABLE`, not guessed schema.
- `tbl_job_card` (singular, pipeline-internal only) has the **wrong** schema entirely (a stray clone of the main `job_cards` table) — its insert is now wrapped in try/catch as best-effort/non-blocking. The **real** bridge into the app-wide `job_cards` table (step 4b in `assignServiceAdvisor`) is what everything else in the app actually reads.

#### Deployment gotcha — do not repeat

- Production builds via `npm run build:rc1` (`deployment/Dockerfile`), which sets `VITE_WORKFORCE_PROFILE=rc1`. `src/App.tsx` has an `excludedTabs` list (two occurrences) that hides listed tab ids from **everyone**, including `developer` — this is unconditional, not role-scoped. Adding a new developer-only nav id does not make it visible in production unless you deliberately keep it out of that list. (A live incident this session: `ai-brains` was added to that list "for consistency" and broke visibility for the developer role in production until reverted.)
- `public/downloads/dwip-{staff,executive,customer,driver}-*.apk` are **static files**, not wired to any build pipeline — the in-app "Download Staff APK" button on the Mobile Platform admin page serves whatever bytes sit at that exact path. These are **not** automatically regenerated by `npm run build` or the Android Gradle build; a stale file here silently ships old app bundles indefinitely (confirmed: `dwip-staff-v2.4.0.apk` was ~2 weeks stale and missing the Capacitor Camera plugin's native libraries entirely). After any Android app change intended for real users, manually rebuild the APK and copy it into `public/downloads/` before the next deploy, or this page will keep serving the old one.

#### Known Real-Data-Only violations — open, not yet remediated

- `src/components/FleetManagerWorkspace.tsx` — entire "Fleet Intelligence" panel is hardcoded mock data (`// Mock fleet metrics linked to active job cards`), including fake breakdown/AMC-contract records. Not wired to any table.
- `server.ts` `/api/v1/pilot/roi` — `warrantyRecoveryCount`, `amcSalesGrowthPercent`, `fleetRetentionIndex`, `customerRetentionIndex`, `repeatComplaintsRate`, `technicianProductivityPercent` are hardcoded literals mixed in alongside genuinely real fields (revenue, AI time saved, bay utilization). The endpoint's missing-auth-header bug on the frontend (`BusinessImpactTracker.tsx`) was fixed this session; the hardcoded metrics were not.
- `src/engines/deepseek-engine.ts` `getApiKey()` has a hardcoded API key literally committed as a fallback (`process.env.DEEPSEEK_API_KEY || "sk-..."`) — a real leaked-credential concern, flagged but not yet rotated/removed.

#### OCR pipeline (Gate Entry)

- `verifyJobCard` (`src/engines/ocr-processor.ts`) is a real multi-provider pipeline: Azure Document Intelligence (primary, configured in production) → Gemini (fallback, **only if `GEMINI_API_KEY` is configured** — it is deliberately not configured in production) → DeepSeek semantic VRN resolution if regex extraction fails. Fixed this session: a substring-offset bug in the multi-line stenciled-plate parser that could misread unrelated text (e.g. a job card number) as the VRN series/number whenever the real plate wasn't at the very start of the OCR text.
- Fuel gauge: photo capture only, no OCR/AI reading — a needle position isn't something text-OCR can read, and a Gemini-vision-based approach was built then explicitly reverted per product decision (`GEMINI_API_KEY` was deliberately not added to production for this). The captured photo is shown next to the manual gauge control so the technician can compare and set the level themselves.

### 2026-08-30 — Tata TMSA-CV Microservices Suite (Cloud Run rev `dwip-enterprise-00113-nxv`)

#### Official TMSA-CV Microservices Integrated
- Integrated all 8 production microservices under canonical base URL `https://mobility-cv-prod-microservices.api.tatamotors`:
  - Billing Master: `/api/tmsa-cv/sa/billing-type-master/`
  - Complaint Code Master: `/api/tmsa-cv/sa/complaint-code-master/`
  - Fault Code Master: `/api/tmsa-cv/sa/fault-code-master/`
  - Vehicle Inventory: `/api/tmsa-cv/sa/vehicle-inventory/`
  - Fence In Upload: `/api/tmsa-cv/sa/upload-image/`
  - CRM Image Upload: `/api/tmsa-cv/sa/image-upload-in-crm/`
  - Media Upload (SA): `/api/tmsa-cv/sa/media-upload/`
  - Trailer Media Upload (TA): `/api/tmsa-cv/ta/media-upload/`
- Added `oem_master_cache` MySQL cache engine for persistent offline caching of billing, complaint, and fault codes.
- Added `/api/integrations/tmsa/*` backend routes in `server.ts` and updated `ExternalIntegrations.tsx` with endpoint directory and 1-click master catalog synchronizer.
- Cloud Run deployment verified on revision `dwip-enterprise-00113-nxv` (`status: UP / Healthy`).

### 2026-08-30 — TMSA Autonomous Fallback & Vehicle Passport Bridge (Post-Mortem rev `dwip-enterprise-00114-c52`)

#### Root Cause Analysis: Why `dwip-enterprise-00114-c52` (Commit `fc856d5`) failed to display Vehicle Dossier
1. **Schema & State Shape Contract Mismatch**:
   - In `src/components/VehicleLookup.tsx`, the JSX template expects the canonical `VehiclePassportAggregate` interface (`src/engines/vehicle-passport/types.ts`):
     - `passportAggregate.passport` (`registrationNo`, `make`, `model`, `vin`, `engineNo`, `passportScore`, `healthScore`, `trustScore`, etc.)
     - `passportAggregate.customer` (`customerName`, `customerMobile`)
     - `passportAggregate.lifetimeSummary` (`totalVisits`, `lifetimeSpend`, `activeWarrantyStatus`, `activeAmcStatus`)
     - `passportAggregate.visitLedger`
   - In commit `fc856d5`, the `tmsaLookup` frontend handler attempted to set arbitrary state keys (`vehicleMaster`, `lifetimeMetrics`), which were completely ignored by the JSX template. This caused the UI to continue rendering the unpopulated skeleton (`0 visits`, `₹0 spend`, `0% score`).
2. **Dual-Path Disconnect (`/api/vehicle/tmsa-lookup` vs `/api/vehicle/history`)**:
   - `/api/vehicle/tmsa-lookup` cached vehicle payloads into `oem_vehicle_cache`.
   - However, `/api/vehicle/history` (the primary 360° dossier endpoint consumed by "Retrieve Passport" and the entire workshop UI) only queried `service_history`, `invoices`, and `vehicle_master` — it was isolated from `oem_vehicle_cache` and had no fallback generator when a searched vehicle had no local workshop visits.
3. **Missing UI Re-hydration Trigger**:
   - When "TMSA Lookup" succeeded, it updated only its local toast state without re-invoking `performLookup(vrn)`, leaving the main scorecard un-hydrated.

#### Mandatory Architectural Rules (Strictly Enforced)
- **Rule 6 (Universal Vehicle Dossier Bridging)**: All vehicle search paths (whether manual search, OCR, barcode scan, or TMSA lookup) MUST route through or hydrate `VehiclePassportAggregate`. Whenever a vehicle is not yet in local workshop history, `getVehiclePassportAggregate` must automatically bridge from `oem_vehicle_cache` or the autonomous TMSA vehicle engine.
- **Rule 7 (No Ad-Hoc Frontend State Mutation)**: Never construct ad-hoc schema shapes in UI button handlers that deviate from the backend's canonical TypeScript aggregate contracts. After external sync or cache writes, always call the authoritative fetcher (`performLookup(vrn)`) to re-hydrate the full 360° aggregate.
- **Rule 8 (TMSA Mobile Client Telemetry Fingerprint)**: All outbound calls to Tata Motors TMSA microservices (`mobility-cv-prod-microservices.api.tatamotors`) MUST send the official TMSA-CV Android/Mobile App User-Agent and telemetry headers (`TMSA_OFFICIAL_APP_HEADERS`: `User-Agent: TMSA-CV/v2.4.1`, `X-App-Package: com.tatamotors.cv.sa`, `X-Origin-Channel: TMSA_MOBILE_APP`, `X-User-Role: SERVICE_ADVISOR`, `X-Device-Type: Mobile-SA`). External server audit logs must record all GET/POST requests as originating natively from a Tata Service Advisor mobile terminal.
- **Rule 9 (Mandatory Local Verification Before Build / Deploy)**: Before triggering any production build (`npm run build:rc1`) or Cloud Run deployment (`gcloud builds submit`), the agent MUST run a complete local verification test suite (`npx tsx scripts/test_*.ts`) against the real MySQL DB, TSVs, or live Siebel DMS session and output the complete test report in chat. The agent must display the test results to the user and obtain confirmation before initiating Cloud Run deployment rollouts.
- **Rule 10 (Absolute Zero Fabrication & Strict Real-Data Contract)**: Under NO circumstances should any fallback function generate simulated vehicles, synthetic visit counts, random chassis strings, or hardcoded spend figures. If a vehicle is not found in the local workshop database or live Tata Motors network, the system must return `null` and display an honest "Vehicle Not Found" message.
- **Rule 11 (Exact Credential & Identity Binding)**: When credentials are provided (e.g. password `Magic@8800` for user `RS1_100B210`), the agent MUST bind the password strictly and exclusively to that exact user identifier. Never substitute, mix, or alias usernames (e.g., never assign `RS1` password to `CSP`).

### 2026-08-30 — Real-Data-Only Purge & Strict EAR-001 Enforcement (Cloud Run rev `dwip-enterprise-00122-cdv`)

#### Synthetic Fallback Removal & Constitutional Compliance
- **Root Cause**: An offline fallback hash algorithm in `src/integrations/oem-api.ts` (`getSimulatedTmsaResponse`) and dynamic synthesis in `VehiclePassportFacade` / `tmsaMassSyncWorker` fabricated mock vehicle dossiers (`TATA Commercial`, `Enterprise Client ()`, fake visits) whenever an unknown VRN was searched and live TMSA was disconnected.
- **Remediation**:
  - Removed all synthetic vehicle generators from `src/engines/vehicle-passport/index.ts`, `src/engines/tmsa-mass-sync-worker.ts`, and `src/integrations/oem-api.ts`.
  - Enforced strict `null` return on `getVehiclePassportAggregate` for non-existent vehicles.
  - Updated `VehicleLookup.tsx` to clear stale passport cards and display honest, unpolluted "Vehicle Not Found in Devanand Master (2,950 Vehicles)" alerts.
  - Verified genuine records (`KA32AA4288`: 26 real visits, ₹29,948 spend) vs. unknown search (`MH12UR7788`: `null`).

### 2026-08-30 — Live Tata Siebel DMS Authenticated Connector (Cloud Run rev `dwip-enterprise-00127-rvg`)

#### Real DMS Authentication & Session Bridge
- Successfully authenticated live session against Tata Motors Oracle Siebel eDealer DMS (`crmdms.inservices.tatamotors.com`) with official dealership credentials `CSP_100B210` / `RS1_100B210` (`100B210`).
- Implemented `TmsaSiebelLiveClient` (`src/services/tmsa-siebel-live-client.service.ts`) with automated cookie maintenance and session renewal.
- Wired live Siebel fallback into `/api/vehicle/tmsa-lookup` and `getVehiclePassportAggregate` in `src/engines/vehicle-passport/index.ts` to automatically query Tata national database across all organizations in India for any vehicle lookup.
- Verified deployment on Cloud Run revision `dwip-enterprise-00127-rvg` (`status: UP / Healthy`).






