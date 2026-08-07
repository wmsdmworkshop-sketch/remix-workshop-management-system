# Workshop Manager Runtime Integration

This document defines the live runtime integration mappings for the **Workshop Manager Operational Cockpit**.

## 1. Connected Engines & Data Sources

All dashboard subwidgets consume live parameters from active state variables loaded via the main `App.tsx` framework:

- **KPI Header**: Aggregates live count arrays (`jobCards` status groupings, daily check-in logs).
- **Live Queue**: Groups active job card models into current workflow queues (`GATE_IN` to `FINAL_REVIEW`).
- **Bay Operations**: Integrates with the central `bays` state and queries matching jobs via `bay_id` associations.
- **Technician Board**: Filters roster `employees` and maps assignments against active `allocations` maps.
- **SLA Hub**: Filters `alertLogs` to track active breaches (`SLA_BREACH`) and warnings (`SLA_WARNING`).
- **Activity Timeline**: Formats recent events sorted chronologically by update timestamps.

## 2. Strict Read-Only Policy Compliance
- **No Mutations**: Mutation actions (such as re-allocation triggers, status updates, and decision approvals) are bypassed or display mock notifications without modifying database rows.
- **Safe Operations**: Submitting updates does not call any database write procedures or POST requests.
- **Offline Resiliency**: Monitors navigator network connection state to display cached storage warnings when offline.
