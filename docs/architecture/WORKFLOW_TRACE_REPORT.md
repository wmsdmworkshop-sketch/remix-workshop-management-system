# DWIP Enterprise ERP - Workflow Trace Report
**Sprint**: RC1-WORKFLOW-TRACE-001  
**Timestamp**: 2026-07-16

This report traces the implementation of the 12 core business capabilities from the React frontend user interface down to the database layer, detailing the components, user actions, invoked APIs, backend routes, controller/service logic, and SQL tables used.

---

## 1. Gate Entry
*   **React Component**: [GateEntryManager.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/GateEntryManager.tsx) (submits form via `handleRegisterEntry` which triggers `onCreateJob` prop mapped to `handleCreateJob` in [App.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/App.tsx#L821-L839))
*   **User Action**: Security guard inputs vehicle license plate (VRN) or scans chassis barcode, fills in customer name/mobile, selects model, inputs odometer, and clicks **"Register Gate Entry"** (Gate-In).
*   **API Endpoint Actually Invoked**: `POST /api/job-cards`
*   **Backend Route**: `/api/job-cards` (POST) in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3348)
*   **Controller/Service**: Express inline handler in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3348-L3408) which pushes to `db.jobCards`, publishes `VEHICLE_GATE_IN` and `INTAKE_INITIALIZED` events via `operationalEventService` (defined in [event-engine.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/core/event-engine.ts)), and triggers local JSON sync.
*   **Database Tables Used**: `job_cards` (local cache), `tbl_workflow_history` (via event stream).
*   **Implementation Status**: Fully Implemented.

---

## 2. Job Card
*   **React Component**: [JobCardManager.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/JobCardManager.tsx) (uses `onUpdateJob` prop mapped to `handleUpdateJob` in [App.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/App.tsx#L860-L877))
*   **User Action**: Service Advisor selects a vehicle in queue, adds work complaints, details, priority, and clicks **"Save"** or **"Update Job Card"**.
*   **API Endpoint Actually Invoked**: `PUT /api/job-cards/:id`
*   **Backend Route**: `app.put("/api/job-cards/:id")` in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773)
*   **Controller/Service**: Express inline handler in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773-L3842) which merges updated fields, updates bay statuses, resolves active alerts, and invokes `syncSave` to persist.
*   **Database Tables Used**: `job_cards` (JSON state) and `job_card_master` (SQL table synced via [sync.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/db/sync.ts#L97)).
*   **Implementation Status**: Fully Implemented.

---

## 3. Estimate
*   **React Component**: [ServiceAdvisorWorkspace.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/ServiceAdvisorWorkspace.tsx) (Labour & Spares Estimate Builder) / [JobCardManager.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/JobCardManager.tsx)
*   **User Action**: Service Advisor enters estimated labor and spares pricing and updates the job card.
*   **API Endpoint Actually Invoked**: `PUT /api/job-cards/:id` (to update labor/spares estimates) and `POST /api/job-cards/:id/revenue` (invoked via `handleCalculateRevenue` in [App.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/App.tsx#L899-L917))
*   **Backend Route**: `/api/job-cards/:id` (PUT) and `/api/job-cards/:id/revenue` (POST) in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3915)
*   **Controller/Service**: Express inline handlers `app.put("/api/job-cards/:id")` and `app.post("/api/job-cards/:id/revenue")` which calculates split allocations for technicians.
*   **Database Tables Used**: `job_cards`, `job_revenues`, `job_revenue_split_details`.
*   **Implementation Status**: Fully Implemented.

---

## 4. Bay Allocation
*   **React Component**: [JobCardManager.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/JobCardManager.tsx) (Bay Selection Dropdown)
*   **User Action**: Floor Supervisor selects a target diagnostic/mechanical bay and saves changes.
*   **API Endpoint Actually Invoked**: `PUT /api/job-cards/:id`
*   **Backend Route**: `app.put("/api/job-cards/:id")` in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773)
*   **Controller/Service**: Inline handler in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773) which assigns `bay_id` and `bay_no` to the job card, transitions the corresponding bay's status in `db.bays` to `"Active"` or `"Idle"`, and triggers SQL synchronization.
*   **Database Tables Used**: `job_cards`, `bays` (also known as `bay_master` in SQL).
*   **Implementation Status**: Fully Implemented.

---

## 5. Technician Assignment
*   **React Component**: [JobCardManager.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/JobCardManager.tsx) (Technician Allocation modal, triggers `onAssignTechnicians` prop mapped to `handleAssignTechnicians` in [App.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/App.tsx#L879-L897))
*   **User Action**: Floor Supervisor chooses one or more technicians, designates their roles (Primary, Co-Tech, etc.), and clicks **"Assign Technicians"**.
*   **API Endpoint Actually Invoked**: `POST /api/job-cards/:id/assign`
*   **Backend Route**: `app.post("/api/job-cards/:id/assign")` in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3892)
*   **Controller/Service**: Express inline handler in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3892-L3912) which removes old mappings for the job and pushes new mappings to `db.jobTechnicianMaps` in the local JSON cache.
*   **Database Tables Used**: `job_technician_maps`.
*   **Implementation Status**: Fully Implemented.

---

## 6. Parts Issue
*   **React Component**: [PartsWarrantyManager.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/PartsWarrantyManager.tsx) (specifically `handleIssuePart` on line 469 which invokes `onUpdateJob` prop mapped to `handleUpdateJob` in [App.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/App.tsx#L860))
*   **User Action**: Parts Manager goes to the **"Parts Issue Requisition"** tab, finds a request, and clicks **"Mark Issued & Release WIP"**.
*   **API Endpoint Actually Invoked**: `PUT /api/job-cards/:id` (with `status: "Active"` and a remark indicating parts release).
*   **Backend Route**: `app.put("/api/job-cards/:id")` in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773)
*   **Controller/Service**: Express inline handler in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773). Parts requests and inventory checks are handled in-memory on the frontend; parts release transitions the job status back to active using the general job card update endpoint.
*   **Database Tables Used**: `job_cards`, `bays`.
*   **Implementation Status**: Implemented under a consolidated route. There is no dedicated `/api/parts/issue` or `/api/parts/reserve` endpoint. The frontend tracks requisitions in local state and updates the Job Card state via `PUT /api/job-cards/:id`.

---

## 7. Labour Entry
*   **React Component**: [TechnicianWorkspace.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/TechnicianWorkspace.tsx) (submits checklist via `onUpdateJob` prop mapped to `handleUpdateJob` in [App.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/App.tsx#L860))
*   **User Action**: Technician checks off tasks on the repair checklist and clicks **"Complete Job"**.
*   **API Endpoint Actually Invoked**: `PUT /api/job-cards/:id` (with `status: "Completed"`).
*   **Backend Route**: `app.put("/api/job-cards/:id")` in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773)
*   **Controller/Service**: Express inline handler in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773) which transitions the bay back to `"Idle"`, sets `completed_at` timestamp, and automatically calculates the actual time taken (`actual_time_taken`) between the job start and completion times.
*   **Database Tables Used**: `job_cards`, `bays`.
*   **Implementation Status**: Fully Implemented.

---

## 8. QC
*   **React Component**: [QCChecklistPanel.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/QCChecklistPanel.tsx) (embedded in [QCInspectorWorkspace.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/QCInspectorWorkspace.tsx), submits via `handleSubmit` on line 123)
*   **User Action**: QC Inspector fills out the quality inspection checklist (Pass/Fail/NA), adds remarks if items failed, and clicks **"Submit QC"**.
*   **API Endpoint Actually Invoked**: `POST /api/job-cards/:id/qc-check`
*   **Backend Route**: `app.post("/api/job-cards/:id/qc-check")` in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L7909)
*   **Controller/Service**: Express inline handler in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L7909-L7980) which updates job card status (to `"QC Passed"` or `"QC Failed"`), inserts failed QC alerts to settings config, and triggers SQL table writes.
*   **Database Tables Used**: `job_cards`, `alert_logs`.
*   **Implementation Status**: Fully Implemented.

---

## 9. Billing
*   **React Component**: [billing-exit.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/billing-exit.tsx) (submits invoice details on line 74)
*   **User Action**: Billing clerk generates/enters a billing invoice number (validated against the pattern `IDEVAN[0-9]{4}[0-9]{6}`) and clicks **"Generate Invoice"**.
*   **API Endpoint Actually Invoked**: `POST /api/job-cards/:id/bill`
*   **Backend Route**: `app.post("/api/job-cards/:id/bill")` in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L6835)
*   **Controller/Service**: Express inline handler in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L6835-L6891) which validates the invoice pattern, updates the status in `job_card_master`, publishes `INVOICE_GENERATED` event, and logs a cashier billing alert in `alert_logs`.
*   **Database Tables Used**: `job_card_master`, `job_cards`, `alert_logs`, `tbl_workflow_history`.
*   **Implementation Status**: Fully Implemented.

---

## 10. Cashier
*   **React Component**: [PreInvoicePanel.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/PreInvoicePanel.tsx) (in [CashierManager.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/CashierManager.tsx))
*   **User Action**: Cashier reviews calculated spares/labor costs, enters a discount amount and transaction reference, and clicks **"Clear Invoice & Grant Gate-Pass"**.
*   **API Endpoint Actually Invoked**: `POST /api/job-cards/:id/pre-invoice` (to send invoice details) and `PUT /api/job-cards/:id` (to record settlement payment and mark job status as `"Invoiced"`).
*   **Backend Route**: `/api/job-cards/:id/pre-invoice` (POST) and `/api/job-cards/:id` (PUT) in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L7982)
*   **Controller/Service**: Express inline handlers `app.post("/api/job-cards/:id/pre-invoice")` and `app.put("/api/job-cards/:id")`.
*   **Database Tables Used**: `job_cards`, `bays`.
*   **Implementation Status**: Fully Implemented.

---

## 11. Gate Pass
*   **React Component**: [VehicleDeliveryWorkspace.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/VehicleDeliveryWorkspace.tsx) (triggers `onUpdateJob` prop mapped to `handleUpdateJob` in [App.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/App.tsx#L860))
*   **User Action**: Gatekeeper or Advisor completes the delivery checklist (cleanliness, fuel, old parts), inputs CSI feedback, signs off, and clicks **"Issue Gate Pass & Finalize Handover"**.
*   **API Endpoint Actually Invoked**: `PUT /api/job-cards/:id` (with `status: "Completed"` and delivery handover details in the remarks).
*   **Backend Route**: `app.put("/api/job-cards/:id")` in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773)
*   **Controller/Service**: Inline handler in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773) which updates the job status to completed.
*   **Database Tables Used**: `job_cards`, `bays`.
*   **Implementation Status**: Implemented under a different flow. There is no dedicated `/api/gate-pass` endpoint. The Gate Pass release is recorded via a job card status change and remarks update sent to `PUT /api/job-cards/:id`.

---

## 12. Vehicle Exit
*   **React Component**: [GateEntryManager.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/GateEntryManager.tsx) (submits gate-out via `handleGateOut` on line 221)
*   **User Action**: Security guard finds the vehicle in the exit queue and clicks **"Mark Gate-Out"**.
*   **API Endpoint Actually Invoked**: `PUT /api/job-cards/:id` (with `status: "Invoiced"` and remarks `"Vehicle cleared Gate-Out"`).
*   **Backend Route**: `app.put("/api/job-cards/:id")` in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773)
*   **Controller/Service**: Inline handler in [server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts#L3773).
*   **Database Tables Used**: `job_cards`, `bays`.
*   **Implementation Status**: Implemented under a different flow. The simulation expected `POST /api/job-cards/{id}/manager-approve` for vehicle exit, but in the application that endpoint is for Manager Approval (transitions status to `"Awaiting Gate Out"`), whereas actual Vehicle Exit is logged as a job update via `PUT /api/job-cards/:id`.
