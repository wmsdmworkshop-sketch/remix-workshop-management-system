# Workshop Manager Operational Cockpit Architecture

This document defines the architecture of the **Workshop Manager Operational Cockpit** for the Devanand Workshop Management System (DWIP).

## 1. Purpose & Business Scope
The Workshop Manager Operational Cockpit acts as the central command center for the workshop floor. Rather than offering basic CRUD views, it consolidates real-time events, queue levels, bay utilization statuses, technician loads, and SLA breaches into a single visual control layout.

## 2. Responsibilities
- **Real-Time Monitoring**: Display active repair progress, current workshop queues, and live bay statuses.
- **Resource Allocation**: Facilitate easy dispatching and overrides for bays and technicians.
- **SLA Risk Alerts**: Provide early visual indicators of potential turnaround time (TAT) breaches.
- **AI Recommendation Matching**: Surface real-time suggestions from the Gemma-4 model.

## 3. Dependencies
- **Frontend Core**: React 19, Lucide React (icons), Recharts (data visualizations), Framer Motion (smooth animations).
- **Backend Services**: Express server, MySQL 8 database with Drizzle ORM.
- **Event Bus & Engines**: Interacts with the central `EventBus` and `WorkflowEngine`.

## 4. Integration Specifications
### Workflow Integration
Tracks state changes in real-time by hooking into the `WorkflowEngine` transitions (`GATE_IN` to `GATE_OUT`). The dashboard reacts immediately when a job card shifts state.

### Queue Integration
Directly reflects queue counts and state assignments from the queue tables (e.g. `INTAKE_QUEUE`, `DIAGNOSTIC_QUEUE`, `WIP_QUEUE`, `QC_QUEUE`, `DELIVERY_QUEUE`).

### Notification Integration
Uses the `NotificationEngine` to raise high-priority desktop/UI notifications for critical events, such as SLA warnings or technician overloads.

### Timeline & Audit Integration
All allocation updates and state transitions generate instant audit trail rows logged via `TimelineEngine` to preserve chronological operation history.

### Decision Log Integration
Every time a manager manually overrides an AI suggestion, the system captures the discrepancy and logs it to `tbl_decision_log` for feedback training.

### AI & Power BI Integration
- **AI Model**: Connects to the Gemma-4 Form Analysis endpoint to pull recommended actions.
- **Power BI**: Incorporates specialized query structures to expose telemetry to regional analytics dashboards.

## 5. Performance & Scalability Targets
- Supports rendering operations up to 100 concurrent vehicles and 12 bays with zero UI stutter.
- Implements request debouncing, local storage cache layers, and memoized selectors to maintain a stable 60 FPS UI experience.

## 6. Future Extension Strategy
Designed with a modular tab structure to easily allow future expansions (e.g., regional multi-workshop monitoring and automatic resource-level balancing engines) without modifying core Workforce 1.1 functionality.
