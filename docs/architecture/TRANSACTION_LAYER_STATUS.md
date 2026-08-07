# DWIP Enterprise ERP - Transactional Layer Status
**Sprint**: RC1-WORKFLOW-TRACE-001  
**Timestamp**: 2026-07-16

This report provides the final assessment of the transactional business layer and explains why the RC1 simulation failed.

## Final Conclusion
**Transaction layer exists; simulation is incorrect.** (Conclusion Option 1)

---

## Architectural Evidence of the Transaction Layer

The transactional business layer is **fully implemented** in the application backend. It is registered directly in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts) and is backed by an in-memory database cache synced to Cloud SQL (MySQL).

The following primary transactional routes exist in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts):
1.  **Job Card Creation**: `POST /api/job-cards` (Line 3348)
2.  **Job Card Update**: `PUT /api/job-cards/:id` (Line 3773)
3.  **Technician Allocation**: `POST /api/job-cards/:id/assign` (Line 3892)
4.  **Revenue Split Calculation**: `POST /api/job-cards/:id/revenue` (Line 3915)
5.  **Repair Start**: `POST /api/job-cards/:id/start-repair` (Line 6772)
6.  **Billing (Invoice generation)**: `POST /api/job-cards/:id/bill` (Line 6835)
7.  **Estimate Approval**: `POST /api/job-cards/:id/estimate-approval` (Line 7766)
8.  **QC Checklist Submission**: `POST /api/job-cards/:id/qc-check` (Line 7909)
9.  **Pre-Invoice (Cashier Checkout)**: `POST /api/job-cards/:id/pre-invoice` (Line 7981)
10. **Manager Approval**: `POST /api/job-cards/:id/manager-approve` (Line 8037)
11. **Event Timeline retrieval**: `GET /api/job-cards/:id/events` (Line 8148)
12. **Live TAT retrieval**: `GET /api/job-cards/:id/tat` (Line 8164)

These endpoints contain rich transactional logic:
*   Updating job states.
*   Enforcing business rules (e.g. validating invoice formats against the pattern `IDEVAN[0-9]{4}[0-9]{6}`).
*   Resolving and creating alert logs.
*   Publishing events to the event engine (`operationalEventService.publish`) which log events like `VEHICLE_GATE_IN`, `INTAKE_INITIALIZED`, `ESTIMATE_APPROVED`, `QC_SUBMITTED`, etc., in the `tbl_workflow_history` table.
*   Writing changes to SQL tables (such as `job_card_master`, `job_technician_maps`, `job_revenues`, `job_revenue_split_details`, etc.) via `syncSave` defined in [sync.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/db/sync.ts).

---

## Causes of Simulation Failure

The RC1 simulation reported a 0.00% success rate due to two main issues:

### 1. Endpoint Mismatches (Architecture vs. Harness)
The simulation harness expects dedicated endpoints for steps like **Inspection**, **Parts Reservation**, **Parts Issue**, **Road Test**, **Wash**, **Gate Pass**, and **Feedback**. 
*   However, in the implemented architecture, these actions are represented via frontend checklist components (e.g., [QCChecklistPanel.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/QCChecklistPanel.tsx), [PartsWarrantyManager.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/PartsWarrantyManager.tsx)) which update the Job Card state using the general `PUT /api/job-cards/:id` endpoint.
*   The simulation calls `POST /api/job-cards/{id}/manager-approve` to represent **Vehicle Exit**. However, in the application, this endpoint is for **Manager Approval** (which moves the job to `"Awaiting Gate Out"`), while the actual Vehicle Exit is logged as a status update to `"Invoiced"` via `PUT /api/job-cards/:id`.

### 2. Mock Port Conflict
The simulation was executed while [scratch/api_server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/scratch/api_server.ts) was running on port 3001 instead of the full application server [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts). Since the mock server only registers two routes (`/api/employees` and `/api/master/vehicles`), all other requests (including authentication at `/api/auth/login` and `/api/job-cards`) returned `404 Not Found`.

---

## Codebase Anomalies

An inspection of the codebase revealed a copy-paste anomaly in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L7833-L7891) inside the `POST /api/job-cards/:id/estimate-approval` handler:
*   The developer copy-pasted QC-related event publishing code (`QC_SUBMITTED`, `FINAL_REVIEW_STARTED`, `QC_FAILED`) into the estimate approval handler.
*   Because `checked_by` and `qc_status` are not present in the estimate approval request body, `qc_status` defaults to `undefined`, which triggers the `else` block to publish a `QC_FAILED` event every time an estimate is approved or rejected by a customer. This triggers incorrect telemetry logs but confirms the transaction handler is running.
