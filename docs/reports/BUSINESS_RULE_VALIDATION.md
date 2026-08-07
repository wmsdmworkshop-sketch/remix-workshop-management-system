# DWIP Enterprise ERP - Business Rule Validation Report
**Sprint**: RC1-LIVE-UAT-002  
**Timestamp**: 2026-07-16  

This report documents the validation of core business logic rules during the live UAT run.

---

## 1. Verified Business Rules

### Rule BR-01: Auto-Generation of Job Card Numbers
*   **Definition**: Every new gate entry must receive a sequential, unique job card number prefixed with `JC`.
*   **Result**: **PASSED**.
*   **Evidence**: Creating a job card for VRN `KA51MC1234` generated `job_id: 6569` with `job_card_no: 'JC6569'`. The numbering sequence is strictly auto-incrementing.

### Rule BR-02: Initial Job Status
*   **Definition**: A newly created job card must have status `Waiting` (or mapped equivalent `Unassigned` in SQL).
*   **Result**: **PASSED**.
*   **Evidence**: The response payload for `POST /api/job-cards` returned `status: 'Waiting'` and the synced MySQL database row had `job_status: 'Unassigned'`.

---

## 2. Blocked Business Rules (Due to Routing Bug)

The following critical business rules could not be validated due to the endpoint failure at Step 5:

*   **Rule BR-03: Estimate Approval Constraint**: A vehicle cannot move to WIP until the customer approves the estimate.
    *   *Status*: **UNVERIFIED**. The approval endpoint `/api/job-cards/:id/estimate-approval` returned 404.
*   **Rule BR-04: Bay Occupancy Rule**: A bay cannot be allocated to a job unless it is active, and once allocated, the bay's status must change to "Occupied".
    *   *Status*: **UNVERIFIED**.
*   **Rule BR-05: Technician Assignment Splits**: A job card cannot compute revenue splits unless at least one technician is mapped.
    *   *Status*: **UNVERIFIED** (confirmed via negative tests, but blocked in primary flow).
*   **Rule BR-06: Billing before QC**: Invoicing a job card requires the QC checklist to be completed and passed.
    *   *Status*: **UNVERIFIED**.
*   **Rule BR-07: Settle before Exit**: A vehicle cannot gate-out until its invoice status is "Paid".
    *   *Status*: **UNVERIFIED**.

---

## 3. Business Logic Recommendations
1.  **Strict Status Transitions**: Implementing a strict state machine validator at the backend route level is recommended. Currently, `PUT /api/job-cards/:id` allows the frontend to send arbitrary statuses (e.g. `Invoiced` or `Active`) without checking if the prerequisite steps (QC, payment, approval) are completed.
2.  **Date Validation**: Ensure that the gate-out timestamp (`gate_out_time`) cannot be set to a date before the job card creation timestamp (`created_at`).
