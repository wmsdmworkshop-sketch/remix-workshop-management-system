# DWIP Enterprise ERP - Negative Test Report
**Sprint**: RC1-LIVE-UAT-002  
**Timestamp**: 2026-07-16  

This report documents the results of executing negative test cases to verify the robustness and error handling of the workshop management system.

---

## 1. Negative Test Cases & Results

### Test N1: Invalid Technician Assignment (Non-existent employee)
*   **Action**: Attempted to assign technician `employee_id: 99999` to Job ID `6569`.
*   **API Endpoint**: `POST /api/job-cards/6569/assign`
*   **Request Payload**: `{ technicians: [{ employee_id: 99999, role: 'Lead Technician' }] }`
*   **Observed Status**: `500 Internal Server Error`
*   **Observed Response**: `TypeError: Cannot read properties of undefined (reading 'map')`
*   **Analysis**: **VULNERABILITY / BUG**.
    The server expects `req.body.allocations` instead of `req.body.technicians`. Because it does not validate input parameters, it attempted to map over `undefined` and crashed with a runtime `TypeError`. It also fails to verify if the provided `employee_id` exists in the database.

### Test N2: Invalid Bay Allocation (Non-existent bay)
*   **Action**: Attempted to allocate bay `bay_id: 99999` to Job ID `6569`.
*   **API Endpoint**: `PUT /api/job-cards/6569`
*   **Request Payload**: `{ bay_id: 99999, status: 'Active' }`
*   **Observed Status**: `200 OK`
*   **Observed Response**: Job card returned with `bay_id: 99999`.
*   **Analysis**: **CRITICAL BUG**.
    The API does not validate if the assigned `bay_id` exists in the `bays` master table. The database has no foreign key constraint enforcing this, allowing corrupt or non-existent bay allocations to be successfully saved.

### Test N3: Revenue Split without Technicians
*   **Action**: Attempted to compute revenue split on a newly created job card (Job ID `6570`) without assigning any technician first.
*   **API Endpoint**: `POST /api/job-cards/6570/revenue`
*   **Request Payload**: `{ parts_amount: 1000, labour_amount: 1000 }`
*   **Observed Status**: `400 Bad Request`
*   **Observed Response**: `{"error":"No technicians assigned to this job card."}`
*   **Analysis**: **PASSED**.
    The application correctly validated that a revenue split cannot be generated if there are no technician maps registered.

### Test N4: Estimate Approval for Non-existent Job
*   **Action**: Attempted to approve an estimate for a non-existent job ID `999999`.
*   **API Endpoint**: `POST /api/job-cards/999999/estimate-approval`
*   **Request Payload**: `{ status: 'approved' }`
*   **Observed Status**: `404 Not Found`
*   **Observed Response**: Empty body
*   **Analysis**: **BLOCKED BY ROUTING BUG**.
    The request returned a 404 with an empty body because the endpoint is registered after the Vite middleware, causing Vite to intercept it and return 404 before it could reach the route handler (which would have returned a proper JSON error `{"success":false,"error":"Job card not found"}`).

---

## 2. Summary of Vulnerabilities & Defects
1.  **Missing Input Parameter Validation**: Handlers assume request body parameters are always present and correctly structured. Missing or malformed parameters result in unhandled Express runtime crashes (HTTP 500).
2.  **Lack of Foreign Key/Data Reference Validation**: System accepts updates containing invalid foreign IDs (e.g. non-existent `bay_id: 99999`) and writes them directly to the database.
3.  **Lack of Relational Database Constraints**: MySQL tables lack foreign keys or constraints that would normally reject invalid data entries (such as non-existent bays or technicians) at the database tier.
