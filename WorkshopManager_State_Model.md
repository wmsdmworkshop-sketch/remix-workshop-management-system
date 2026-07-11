# Workshop Manager State Model

This document specifies the state architecture, caching strategies, and data synchronization flows for the Workshop Manager Module.

## 1. React Context & State Ownership
A unified `WorkshopManagerContext` will wrap all cockpit subcomponents:
- **Shared Context Providers**:
  - `jobCards`: Array of active and waiting Job Cards.
  - `bays`: Array of workshop bays.
  - `employees`: Active workforce roster.
  - `allocations`: Map of technician assignments.
  - `selectedWorkshopId`: Number identifying the selected active workshop.

## 2. State Stores
- **Server State**: Syncs with `/api/job-cards`, `/api/bays`, `/api/employees`, and `/api/carry-forward` endpoints.
- **Local State**: UI toggles, search queries, active card selections, and allocation form inputs.
- **Real-Time State**: Driven by event polling or WebSockets. Handles `QUEUE_UPDATED`, `TIMELINE_APPENDED`, and `SLA_BREACHED` triggers.

## 3. Derived & Memoized State
Using React's `useMemo` to prevent unnecessary component re-renders:
- **`bayUtilization`**: Percentage of non-idle bays (`(activeBays / totalBays) * 100`).
- **`techLoad`**: Number of active jobs per technician to flag overloads.
- **`slaBreachQueue`**: Sorted list of jobs nearing their estimated delivery time.
- **`heatMapValues`**: Distribution of vehicles across all queue columns.

## 4. Cache & Synchronization Strategy
- **Caching**: Local caching in `localStorage` for quick initial load times.
- **Polling Fallback**: A 15-second polling tick to pull incremental updates from the server without causing MySQL load spikes.
- **Optimistic Updates**: Immediate UI state change when assigning a technician, reverting back to actual database values if the API request fails.
- **Error Recovery**: Handles network drops gracefully by displaying a warning banner and switching back to retry modes automatically.
