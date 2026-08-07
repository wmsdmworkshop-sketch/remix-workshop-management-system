# Workshop Manager Discovery Report

This report documents the current state of WMS Workshop configurations, APIs, screens, and workflows relevant to the Workshop Manager module.

## 1. Existing Workshop Manager Screens
- Currently, there is **no dedicated Workshop Manager screen or dashboard panel**.
- A general `Dashboard` component handles summary analytics for all roles.
- `ActiveBayTatMonitor` is a read-only list with analytics features accessed via the `bay-tat` tab.

## 2. Existing Bay Allocation Logic
- Direct assignment is triggered via the Job Card form or when starting a Job Card from `GATE_IN` to `Active` state via `onUpdateJob(jobId, { status: "Active", bay_id })`.
- Selection options are driven by local and server-synced master configurations (`bays` state loaded in `App.tsx` from `/api/bays`).
- Gemma AI Copilot offers recommended bay selection based on service type.

## 3. Existing Technician Allocation
- Job cards are assigned to technicians via the `/api/job-cards/:id/assign` API.
- Multiple technicians can be added with specific roles (`Primary Technician`, `Co-Technician`, `Electrician`, `Add Tech`) mapped in `JobTechnicianMap`.

## 4. Existing Workflow Integration
- Uses `WorkflowEngine.transition` to move job cards through states (`GATE_IN` ➔ `INTAKE_PENDING` ➔ `DIAGNOSTIC_WIP` ➔ `ESTIMATE_PENDING` ➔ `ESTIMATE_APPROVED` ➔ `WIP_START` ➔ `QC_PENDING` ➔ `FINAL_REVIEW` ➔ `INVOICED` ➔ `GATE_OUT`).
- Supports override logging to `tbl_decision_log` for authorized roles (`Supervisor`, `Admin`).

## 5. Existing APIs
- **Job Cards**: `/api/job-cards` (GET, POST), `/api/job-cards/:id` (PUT), `/api/job-cards/:id/assign` (POST), `/api/job-cards/:id/revenue` (POST).
- **Bays**: `/api/bays` (GET, POST, PUT, DELETE).
- **Workforce**: `/api/employees` (GET, POST, PUT, DELETE).
- **Carry Forward / Rework Logs**: `/api/carry-forward` (GET, POST, PUT), `/api/rework` (GET, POST, PUT).

## 6. Existing Dashboard Components
- Standard KPIs (vehicles inside, open job cards, today delivery count, active technicians).
- Recharts-based Area and Bar charts displaying revenue trend and bay efficiency metrics.

## 7. Existing RBAC Rules
- User role `workshop_manager` has permissions mapped to:
  - `dashboard`, `vehicle-lookup`, `gate-entry`, `parts-warranty`, `billing-exit`, `jobs`, `productivity`, `bay-tat`, `employees`, `certification`, `attendance`, `dms-import`, `revenue`.
- High-level changes (like overrides) are currently restricted to `Supervisor` and `Admin`. The role `workshop_manager` needs to be mapped to full supervisor/managerial bypass capabilities.
