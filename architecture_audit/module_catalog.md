# DWIP V1 UI Module Catalog

This document catalogs the core React components located in `src/components/` that define the main layout panels and features of the workforce management dashboard.

---

## 1. Operations & Workshop Stage Monitors

### `ActiveBayTatMonitor.tsx`
- **Location**: `src/components/ActiveBayTatMonitor.tsx`
- **Description**: Monitored active workshop bays. Displays current bay status (Idle, Busy, Blocked), vehicle details currently occupying the bay, and calculates real-time Turnaround Time (TAT) metrics.

### `GateEntryManager.tsx`
- **Location**: `src/components/GateEntryManager.tsx`
- **Description**: Security gateway entry log. Handles vehicle check-in, VRN license registration, driver profile logs (including image uploads), odometer readings, and prints physical entrance tokens.

### `JobCardManager.tsx`
- **Location**: `src/components/JobCardManager.tsx`
- **Description**: Core system module. Controls job cards lifecycle (Draft, Scheduled, In Progress, Invoiced, Completed). Integrates technician allocation maps, revenue calculations, parts requisitions, and logs carry-forward/rework events.

### `CashierManager.tsx`
- **Location**: `src/components/CashierManager.tsx`
- **Description**: Finance and exit check module. Validates parts and labor invoice pricing, collects payments (Cash, Cards, UPI), issues gate passes, and registers vehicle departure timestamps.

---

## 2. Workforce & Attendance Modules

### `AttendanceShiftLog.tsx`
- **Location**: `src/components/AttendanceShiftLog.tsx`
- **Description**: Serves as the primary attendance and shift logging container. Merges the daily workforce shift logs, employee self-service check-in, and overtime dashboards into a single view via inline sub-navigation.

### `SelfServiceAttendance.tsx`
- **Location**: `src/components/SelfServiceAttendance.tsx`
- **Description**: Specialized layout for mobile or kiosk devices. Allows technicians to log shift check-in/out using face verification biometrics and GPS boundary checks.

### `OvertimeEmployeeDashboard.tsx`
- **Location**: `src/components/OvertimeEmployeeDashboard.tsx`
- **Description**: Displays individual employee overtime statistics, calculations, and active overtime claims.

### `OvertimeApprovalPortal.tsx`
- **Location**: `src/components/OvertimeApprovalPortal.tsx`
- **Description**: Multi-level overtime approval screen. Supervisors and managers can audit logs, verify GPS/biometric mismatch logs, inspect AI recommendations, and approve or reject overtime requests.

---

## 3. Analytics & Productivity Dashboards

### `Dashboard.tsx`
- **Location**: `src/components/Dashboard.tsx`
- **Description**: Main workspace layout. Aggregates and plots real-time KPIs, active bay utilization, today's deliveries, open jobs, and projected vs. realized revenue.

### `ProductivityDashboard.tsx`
- **Location**: `src/components/ProductivityDashboard.tsx`
- **Description**: Technician efficiency tracker. Visualizes utilization rates, job quality scores, average durations, and generates productivity alert warnings.

---

## 4. Administration & Utilities

### `UserManagement.tsx`
- **Location**: `src/components/UserManagement.tsx`
- **Description**: System operators and access control manager. Oversees credentials, system roles, mobile authorization, and module-level permission matrices.

### `DmsImporter.tsx`
- **Location**: `src/components/DmsImporter.tsx`
- **Description**: Sync tool that parses uploaded DMS CSV invoice spreadsheets and resolves data mismatch conflicts against local records.
