# DWIP Enterprise ERP - RC1 Blocker Root Cause Forensic Report
**Sprint**: RC1-TXN-FORENSICS-001  
**Timestamp**: 2026-07-16  

This report classifies the critical blockers, provides key metrics, and details the blueprint to move the RC1 release from **NO-GO** to **GO**.

---

## 1. Route Metrics & Statistics

*   **Total Transaction APIs**: 10
*   **Reachable APIs**: 4 (`POST /api/job-cards`, `PUT /api/job-cards/:id`, `POST /api/job-cards/:id/assign`, `POST /api/job-cards/:id/revenue`)
*   **Broken APIs**: 6 (`POST /api/job-cards/:id/start-repair`, `POST /api/job-cards/:id/bill`, `POST /api/job-cards/:id/estimate-approval`, `POST /api/job-cards/:id/qc-check`, `POST /api/job-cards/:id/pre-invoice`, `POST /api/job-cards/:id/manager-approve`)
*   **Missing APIs**: 0 (all routes are registered but blocked)
*   **Blocked APIs**: 6 (blocked by Vite middleware placement)
*   **Average Latency (Reachable Routes)**:
    *   *First Write / DB Load*: **28 minutes** (due to DNS resolution retry loop and full remote DB sync)
    *   *Subsequent Cached Writes*: **0.5s to 3.2s**
*   **Average Database Writes per Sync**: 6,636 rows updated sequentially
*   **Average Sync Time**: **~8.2 minutes** (when cache is cold or format changes)

---

## 2. Defect Classification Matrix

| Defect ID | Severity | Description | Fix Complexity | Est. Dev-Hours |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | **P0 (Blocker)** | Express Route Ordering: Vite dev server middleware mounted before API routes, intercepting and blocking 6 transaction endpoints. | Low | 1 hour |
| **DEF-02** | **P1 (Critical)** | Sequential `syncSave` Latency: Single-threaded looping of 6,566 rows over TCP causes 8-minute thread block and socket timeouts. | Medium | 12 hours |
| **DEF-03** | **P1 (Critical)** | Alert Log Database Failures: Silently swallowed SQL exceptions due to mismatch between code query parameters and database schema. | Low | 3 hours |
| **DEF-04** | **P2 (Major)** | Missing Technician Assignment Input Validation: Server crashes (500 TypeError) on body key mismatch. | Low | 3 hours |
| **DEF-05** | **P2 (Major)** | Lack of Master Reference Verification: PUT request allows setting non-existent `bay_id` values (e.g. `99999`). | Low | 3 hours |
| **DEF-06** | **P3 (Minor)** | Delayed POST Ingestion: Newly created vehicles are not synced to SQL immediately on POST, creating state drift. | Low | 2 hours |

---

## 3. Minimum Engineering Blueprint (GO-LIVE Blueprint)

To move RC1 to a **GO** release state, the following minimum engineering tasks must be executed:

### Q1: What is the minimum engineering work required before RC1 can become GO?
1.  **Reorder Middleware**: Move the Vite dev server block (lines 6631–6643) in `server.ts` below all API route definitions, directly above `app.listen()`.
2.  **Surgical DB Syncing**: Optimize `syncSave` in `src/db/sync.ts` by checking a local "dirty" flag or tracking only changed IDs so that it only updates modified rows in SQL, rather than doing a full dump of 6,566 rows.
3.  **Align Alert Log Schemas**: Fix the columns in `server.ts` (lines 3852, 3864, 3876, 6896, 7960, 8070) to map to `alert_logs` (`alert_config_id`, `entity_type`, `entity_id`, `alert_message`) instead of incorrect legacy fields (`jc_id`, `role`, `type`).
4.  **Add Input Validation**: Implement simple checks on `req.body` parameters inside `/api/job-cards/:id/assign` and `/api/job-cards/:id` to reject missing keys and verify master references.

### Q2: Project Scope & Impact Estimate

*   **Developer-hours**: 24 developer-hours (3 working days)
*   **Files Impacted**: 3 files
    1.  [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts) (Route ordering, alert schema alignment, parameter validation)
    2.  [src/db/sync.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/db/sync.ts) (DB synchronization optimization)
    3.  [src/db/index.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/db/index.ts) (Helper changes for incremental sync)
*   **Routes Impacted**: 8 routes
    *   `/api/job-cards/:id/start-repair`
    *   `/api/job-cards/:id/bill`
    *   `/api/job-cards/:id/estimate-approval`
    *   `/api/job-cards/:id/qc-check`
    *   `/api/job-cards/:id/pre-invoice`
    *   `/api/job-cards/:id/manager-approve`
    *   `/api/job-cards/:id/events`
    *   `/api/job-cards/:id/tat`
*   **Regression Scope**: Limited strictly to backend API routing and database persistence layer. The React frontend SPA remains unaffected.
*   **Risk Level**: **LOW**. Correcting Express route mounting orders and standardizing SQL columns is low-risk refactoring that utilizes existing framework mechanics.
