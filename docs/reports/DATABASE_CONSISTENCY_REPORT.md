# DWIP Enterprise ERP - Database Consistency Report
**Sprint**: RC1-LIVE-UAT-002  
**Timestamp**: 2026-07-16  

This report verifies database consistency and state transitions during the live UAT run.

---

## 1. SQL State Transitions for Job Card `JC6569` (Job ID: `6569`)

### Step 1: Gate Entry
*   **Database State BEFORE**: No record with `job_card_id = 6569` exists in `job_card_master`.
*   **Database State AFTER**: No record in `job_card_master` yet. (Note: Gate Entry only calls `saveDB` to write to the JSON cache. It is written to SQL in the next step when a `PUT` request invokes `syncSave`).
*   **Event Log Transitions**: `tbl_workflow_history` successfully received 2 events:
    1.  `VEHICLE_GATE_IN` (remarks: "Vehicle registered at gate.", state: `"GATE_IN"`)
    2.  `INTAKE_INITIALIZED` (remarks: "Job card intake initiated.", state: `"INTAKE_PENDING"`)

### Step 2: Job Card Creation
*   **Database State BEFORE**: No record in `job_card_master`.
*   **Database State AFTER**: A row is successfully upserted into `job_card_master`:
    *   `job_card_id`: `6569`
    *   `job_card_no`: `'JC6569'`
    *   `vehicle_reg`: `'KA51MC1234'`
    *   `customer_name`: `'John Doe'`
    *   `driver_mobile`: `'9876543210'`
    *   `job_status`: `'Unassigned'` (maps from `'Waiting'`)
    *   `live_status`: `'Waiting'`
    *   `billing_status`: `'Pending'`
*   **Event Log Transitions**: No new events (managed via JSON update).

### Step 3: Inspection
*   **Database State BEFORE**: `remarks` is empty on the database row.
*   **Database State AFTER**: `remarks` column is updated to include the safety check:
    *   `remarks`: `"Inspection: 5-point safety checklist completed. Front pads worn out, rear pads okay. All fluids topped up."`

### Step 4: Estimate
*   **Database State BEFORE**: `estimated_amount` is `0`.
*   **Database State AFTER**: `estimated_amount` is updated in `job_card_master`:
    *   `estimated_amount`: `5000` (calculated as Spares `3500` + Labor `1500`)

---

## 2. Database Orphan Record Verification

We audited all transactional tables to check if any orphan records were created for `job_id = 6569`:

| Table Name | Mapped Column | Row Count for Job 6569 | Status | Analysis |
| :--- | :--- | :--- | :--- | :--- |
| `job_card_master` | `job_card_id` | 1 | **CONSISTENT** | Parent record exists. |
| `job_technician_maps` | `job_id` | 0 | **CONSISTENT** | No technicians assigned yet due to failure. |
| `job_revenues` | `job_id` | 0 | **CONSISTENT** | No revenue splits calculated yet. |
| `job_revenue_split_details`| `revenue_id` | 0 | **CONSISTENT** | No split details. |
| `tbl_workflow_history` | `job_id` | 2 | **CONSISTENT** | Only contains initial Gate-In events. |
| `alert_logs` | `entity_id` | 0 | **CONSISTENT** | No alerts generated yet. |
| `qc_checklist` | `job_id` | 0 | **CONSISTENT** | No QC checklists created. |
| `customer_passports` | `linked_vehicles`| 0 | **CONSISTENT** | No linked vehicle records created. |

---

## 3. Data Integrity Findings
1.  **Delayed SQL Sync on Creation**: The `POST /api/job-cards` endpoint does not call `syncSave` directly. The record is stored in memory first and only synced to `job_card_master` during the next route call that triggers `syncSave` (in this case, Step 2: Job Card Creation). This creates a temporary sync delay between JSON cache and SQL, though it is resolved by subsequent actions.
2.  **No Orphan Leakage**: The system did not write any stray child records, indicating relational integrity is maintained at the application layer.
