# Workshop Manager Performance Targets

This document defines the key performance indicators (KPIs) and maximum latency thresholds for the Workshop Manager Operational Cockpit.

## Latency SLA Thresholds

| Operation | Target Duration | Maximum Limit | Action on Exceeding |
| :--- | :---: | :---: | :--- |
| **Initial Dashboard Load** | **< 1.0s** | **2.5s** | Trigger lazy-loading for sub-widgets. |
| **Incremental Sync/Refresh** | **< 200ms** | **500ms** | Switch to incremental diff patching. |
| **Allocation UI Response** | **< 50ms** | **150ms** | Apply Optimistic UI updates. |
| **Queue Recalculation** | **< 10ms** | **50ms** | Throttle re-renders with requestAnimationFrame. |
| **Alert/SLA Notification** | **Immediate** | **1.0s** | Trigger system notification. |

## Target Workload Scale
- **Expected Concurrent Users**: Up to **50 concurrent manager/advisor dashboards**.
- **Expected Active Vehicles**: Up to **500 active job cards** in the daily pool.
- **Expected Operations Per Hour**: Up to **120 state updates** or allocation changes.
