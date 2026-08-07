# Workshop Manager Event Flow

This document details the live event flow and telemetry propagation across the Workshop Manager Cockpit.

## Workflow Event Propagation Diagram

```
[Service Advisor / Tech Action]
             ↓
     JOB_CARD_CREATED 
             ↓
     QUEUE_UPDATED (Intake/WIP)
             ↓
     WORKSHOP_MANAGER_REFRESH (Uplink)
             ↓
     TIMELINE_APPEND (Timeline Engine)
             ↓
     AUDIT_APPEND (Audit logs)
             ↓
     POWERBI_REFRESH (Warehouse telemetry)
```

## Incoming Events (Dashboard Subscriptions)
- **`JOB_CARD_CREATED`**: Fired when a new job is logged in reception. Adds vehicle to the intake queue.
- **`QUEUE_UPDATED`**: Fired when a vehicle shifts stage. Updates queue boards and heatmaps.
- **`SLA_BREACHED`**: Promotes vehicle to the top warning banner.
- **`TIMER_EXPIRED`**: Triggered when a state delay limit is hit.
- **`REWORK_RAISED`**: Highlights vehicle in the CarryForward / Rework widget.

## Outgoing Events (Manager Cockpit Actions)
- **`BAY_ALLOCATED`**: Reassigns a vehicle to a new bay space.
- **`TECHNICIAN_ASSIGNED`**: Overwrites technician allocation maps.
- **`CARRY_FORWARD_RESOLVED`**: Logs manager approval or rejection.
- **`DECISION_OVERRIDDEN`**: Logs manager bypass of AI suggestions to `tbl_decision_log`.
