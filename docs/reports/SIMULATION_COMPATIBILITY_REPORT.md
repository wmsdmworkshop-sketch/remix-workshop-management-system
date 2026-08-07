# DWIP Enterprise ERP - Simulation Compatibility Report
**Sprint**: RC1-WORKFLOW-TRACE-001  
**Timestamp**: 2026-07-16

This report lists the architectural mismatches between the simulation harness ([rc1_simulation.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/scratch/rc1_simulation.ts)) and the actual implemented web application architecture ([server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/server.ts)).

---

## Mismatches Matrix

### 1. Step S05: Inspection
*   **Expected Endpoint (Simulation)**: `POST /api/job-cards/{id}/inspection`
*   **Actual Endpoint (Application)**: None (State managed purely in frontend)
*   **Reason for Mismatch**: The digital inspection checklists and photo attachments are handled as frontend-only states inside the [ServiceAdvisorWorkspace.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/ServiceAdvisorWorkspace.tsx) UI component. There is no dedicated backend API endpoint or database tables allocated for storing the digital inspection checklists.

---

### 2. Step S10: Parts Reservation
*   **Expected Endpoint (Simulation)**: `POST /api/parts/reserve`
*   **Actual Endpoint (Application)**: None (State managed purely in frontend)
*   **Reason for Mismatch**: Parts request and reservation lists are kept in local component state inside [PartsWarrantyManager.tsx](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/components/PartsWarrantyManager.tsx). No transactional parts reservation backend API endpoint exists.

---

### 3. Step S11: Parts Issue
*   **Expected Endpoint (Simulation)**: `POST /api/parts/issue`
*   **Actual Endpoint (Application)**: `PUT /api/job-cards/:id`
*   **Reason for Mismatch**: In the real application flow, releasing parts and resuming the work in progress is completed by calling the general job card update endpoint `PUT /api/job-cards/:id` (updating the status back to `"Active"` and setting a remark). There is no dedicated `/api/parts/issue` route.

---

### 4. Step S14: Road Test
*   **Expected Endpoint (Simulation)**: `POST /api/job-cards/{id}/road-test`
*   **Actual Endpoint (Application)**: `POST /api/job-cards/:id/qc-check`
*   **Reason for Mismatch**: The road test verification is not a separate step or endpoint. It is tracked as item #2 ("Test drive completed") inside the 5-point checklist submitted to the QC check endpoint `/api/job-cards/:id/qc-check`.

---

### 5. Step S15: Wash
*   **Expected Endpoint (Simulation)**: `POST /api/job-cards/{id}/wash`
*   **Actual Endpoint (Application)**: `POST /api/job-cards/:id/qc-check`
*   **Reason for Mismatch**: Cleaning/washing the vehicle is captured as checklist item #4 ("Vehicle interior/exterior cleaned") in the overall QC checklist panel and is sent to `/api/job-cards/:id/qc-check`. No separate wash endpoint is implemented.

---

### 6. Step S18: Gate Pass
*   **Expected Endpoint (Simulation)**: `POST /api/gate-pass`
*   **Actual Endpoint (Application)**: `PUT /api/job-cards/:id`
*   **Reason for Mismatch**: The system does not have a separate `/api/gate-pass` endpoint. The Gate Pass status is registered on the job card itself when payment is settled (status updated to `"Invoiced"`) or delivery checklist is signed off (status updated to `"Completed"`) via the general `PUT /api/job-cards/:id` route.

---

### 7. Step S19: Vehicle Exit
*   **Expected Endpoint (Simulation)**: `POST /api/job-cards/{id}/manager-approve`
*   **Actual Endpoint (Application)**: `PUT /api/job-cards/:id` (with `remarks: "Vehicle cleared Gate-Out"`)
*   **Reason for Mismatch**: The simulation harness calls `/api/job-cards/{id}/manager-approve` to represent vehicle exit. In the actual application:
    *   `POST /api/job-cards/:id/manager-approve` is used by a supervisor/manager to approve the job card for checkout, transitioning the status to `"Awaiting Gate Out"` and alerting the cashier.
    *   The actual vehicle exit (Gate-Out) is logged by the security guard in the Gate Entry UI, calling `PUT /api/job-cards/:id` with a `"Vehicle cleared Gate-Out"` remark.

---

### 8. Step S20: Customer Feedback
*   **Expected Endpoint (Simulation)**: `POST /api/feedback`
*   **Actual Endpoint (Application)**: `PUT /api/job-cards/:id` (remarks update) or `/api/cxo/feedback` / `/api/v1/customer/feedback`
*   **Reason for Mismatch**: CSI rating scores and customer verbal feedback are logged directly in the job card's remarks using `PUT /api/job-cards/:id` during delivery checkout. The root path `/api/feedback` is not registered; feedback endpoints are mounted under sub-routers (e.g., `/api/cxo/feedback` for CXO metrics or `/api/v1/customer/feedback` for customer portal ratings).

---

### 9. Step S23: Day Close
*   **Expected Endpoint (Simulation)**: `POST /api/day-close`
*   **Actual Endpoint (Application)**: None
*   **Reason for Mismatch**: Day close is not implemented as a transaction endpoint in the backend.

---

### 10. Port & Server Configuration Mismatch (Simulation Failure Root Cause)
*   **Expected Behavior (Simulation)**: Running the test scenario against the fully-configured application server (`server.ts`) which listens on port 3001.
*   **Actual Behavior (Simulation)**: The simulation ran against the mock development server ([scratch/api_server.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/scratch/api_server.ts)) which was running on port 3001.
*   **Reason for Mismatch**: Because the mock server was active on port 3001 instead of the full application server, it returned `404 Not Found` for all endpoint calls (including `/api/auth/login` and `/api/job-cards` which do exist in the main `server.ts`).
