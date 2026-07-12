# DWIP Operational Event Catalog v1.0

This catalog defines the standardized schema, sources, categories, and types for every operational event within the Devanand Workshop Management System (DWIP), supporting the CR-002 Event Engine architecture.

---

## 1. Global Event Envelope

Every operational event in DWIP must contain the following fields:

| Field | Type | Description | Constraints / Formats |
| :--- | :--- | :--- | :--- |
| `event_id` | String | Unique UUID/ID for the event. | Prefix `EV-` followed by timestamp and random suffix. |
| `job_id` | Integer | Reference to the local WMS Job Card ID. | Must match `job_cards.job_id`. |
| `job_card_no` | String | Reference to the Oracle Siebel Job Card Number. | Matches Siebel record to preserve integration integrity. |
| `timestamp` | String | ISO-8601 UTC timestamp of when the event occurred. | Format: `YYYY-MM-DDTHH:mm:ss.sssZ` |
| `user` | String | Username or display name of the actor triggering the event. | Max 100 characters. |
| `role` | String | Role classification of the actor. | e.g. `Security`, `Service Advisor`, `Technician`, `QC Inspector`, `Supervisor`, `Admin`, `System`. |
| `workshop` | String | ID or Code of the workshop where the event occurred. | Maps to `workshops.workshop_id`. |
| `source` | String | Channel triggering the event. | Allowed: `Manual`, `Oracle Import`, `Mobile`, `QR Scan`, `CCTV`, `System`, `API`. |
| `event_type` | String | High-level identifier of the operational action. | e.g. `VEHICLE_GATE_IN`, `WIP_STARTED` (See Section 3). |
| `remarks` | String | Free-text narrative notes or justification details. | Optional/Nullable. |
| `correlation_id` | String | Unique ID mapping all events belonging to the same transaction session. | Required. |
| `parent_event_id` | String | References the parent event that triggered this event. | Optional/Nullable. |
| `sequence_number` | Integer | Monotonically increasing sequential index per job card. | Starts at `1` for the first event of a job card. |
| `source_system` | String | Name of system originating the event. | e.g., `WMS-Core`, `Oracle-Siebel`, `CCTV-Camera-01`. |
| `event_version` | String | Event schema version for compatibility tracking. | e.g., `1.0`. |
| `event_status` | String | Execution status of the event. | Allowed: `PROCESSED`, `PENDING`, `FAILED`. |
| `payload` | String (JSON) | Event-specific metadata variables. | Optional/Nullable. |

---

## 2. Event Categories

Events are partitioned into six logical categories to streamline analysis and auditing:

1.  **Operational**: Core state transitions and floor status changes.
2.  **Integration**: Events syncing state or data with external systems like Oracle Siebel.
3.  **System**: Auto-triggered actions, timers, or threshold validations.
4.  **AI**: Recommendations and model analysis outputs.
5.  **CCTV**: Automated license plate scans at physical workshop boundaries.
6.  **Mobile**: Direct actions initiated by technicians or supervisors via handheld devices.

---

## 3. Operational Event Types & State Mapping

The core state transition events map directly to the 12-state workflow machine in the DWIP workflow engine:

### 1. `VEHICLE_GATE_IN`
*   **State Mapping**: `GATE_IN`
*   **Category**: `CCTV` or `Operational`
*   **Trigger**: Vehicle passes CCTV scanning gate or security officer manually registers entrance.
*   **Business Significance**: Establishes the start of the overall turnaround time (TAT) ledger.

### 2. `INTAKE_INITIALIZED`
*   **State Mapping**: `INTAKE_PENDING`
*   **Category**: `Operational`
*   **Trigger**: Service Advisor initiates job card intake.
*   **Business Significance**: Job description and customer info captured.

### 3. `DIAGNOSTIC_STARTED`
*   **State Mapping**: `DIAGNOSTIC_WIP`
*   **Category**: `Operational`
*   **Trigger**: Technician begins vehicle inspection in a dedicated diagnostic bay.
*   **Business Significance**: Inspection period start.

### 4. `ESTIMATE_PREPARED`
*   **State Mapping**: `ESTIMATE_PENDING`
*   **Category**: `Operational`
*   **Trigger**: Technician/Advisor submits the repair parts & labor estimate list.
*   **Business Significance**: Awaiting customer approval.

### 5. `ESTIMATE_APPROVED`
*   **State Mapping**: `ESTIMATE_APPROVED`
*   **Category**: `Operational`
*   **Trigger**: Customer confirms approval via OTP or signature authorization.
*   **Business Significance**: Unblocks job card for parts routing or floor allocations.

### 6. `PARTS_REQUESTED`
*   **State Mapping**: `PARTS_PENDING`
*   **Category**: `Integration`
*   **Trigger**: WMS requests inventory dispatch from Oracle Siebel Parts Warehouse.
*   **Business Significance**: Time spent waiting for inventory procurement.

### 7. `WIP_STARTED`
*   **State Mapping**: `WIP_START`
*   **Category**: `Operational`
*   **Trigger**: Technician allocates vehicle to service bay and starts labor.
*   **Business Significance**: Core repair stage starts.

### 8. `QC_SUBMITTED`
*   **State Mapping**: `QC_PENDING`
*   **Category**: `Operational`
*   **Trigger**: Technician finishes work and parks vehicle in QC bay.
*   **Business Significance**: Repair complete, awaiting quality checklist evaluation.

### 9. `QC_FAILED`
*   **State Mapping**: `QC_FAILED`
*   **Category**: `Operational`
*   **Trigger**: QC Inspector fails road test or checklist checklist item.
*   **Business Significance**: Escalates vehicle back to rework queue; increments rework count.

### 10. `FINAL_REVIEW_STARTED`
*   **State Mapping**: `FINAL_REVIEW`
*   **Category**: `Operational`
*   **Trigger**: QC Inspector passes vehicle checklist.
*   **Business Significance**: Repair qualified; vehicle moved to delivery queue.

### 11. `INVOICE_GENERATED`
*   **State Mapping**: `INVOICED`
*   **Category**: `Integration`
*   **Trigger**: Cashier prints invoice and marks billing settlement.
*   **Business Significance**: Financial reconciliation complete.

### 12. `VEHICLE_RELEASED`
*   **State Mapping**: `GATE_OUT`
*   **Category**: `CCTV` or `Operational`
*   **Trigger**: Security checks gate-pass token and logs vehicle exit.
*   **Business Significance**: Concludes the turnaround time (TAT) ledger.

---

## 4. Secondary Operational Events

These auxiliary events track critical resource changes without altering the core workflow state:

| Event Type | Category | Role | Description |
| :--- | :--- | :--- | :--- |
| `BAY_ALLOCATED` | Operational | Supervisor | Vehicle moves to a new bay workspace. |
| `TECHNICIAN_ASSIGNED` | Operational | Supervisor | Crew member mapped to a specific job card role. |
| `DECISION_OVERRIDDEN` | AI | Supervisor | Manager overrides AI recommendations. |
| `SLA_BREACHED` | System | System | Active job card breaches its ETD time limit. |

---

## 5. Frozen Live Turnaround Time (TAT) Formulas

Live TAT is calculated strictly using event timestamp differences.

1.  **Total Turnaround Time (Total TAT)**:
    $$\text{Total TAT} = \text{Timestamp}(\text{VEHICLE\_RELEASED}) - \text{Timestamp}(\text{VEHICLE\_GATE\_IN})$$
    *(If the vehicle is still active on the floor, the current system time is used as the end point).*
2.  **Diagnostic Time**:
    $$\text{Diagnostic Time} = \text{Timestamp}(\text{ESTIMATE\_PREPARED}) - \text{Timestamp}(\text{DIAGNOSTIC\_STARTED})$$
3.  **Active WIP Repair Time**:
    $$\text{WIP Repair Time} = \sum_{i=1}^{n} \left( \text{Timestamp}(\text{QC\_SUBMITTED}_i) - \text{Timestamp}(\text{WIP\_STARTED}_i) \right)$$
    *(Accumulates multiple runs if the vehicle undergoes rework due to QC failure).*
4.  **Rework Duration**:
    $$\text{Rework Duration} = \sum_{i=1}^{n-1} \left( \text{Timestamp}(\text{WIP\_STARTED}_{i+1}) - \text{Timestamp}(\text{QC\_FAILED}_i) \right)$$
5.  **Billing Latency**:
    $$\text{Billing Latency} = \text{Timestamp}(\text{INVOICE\_GENERATED}) - \text{Timestamp}(\text{FINAL\_REVIEW\_STARTED})$$
