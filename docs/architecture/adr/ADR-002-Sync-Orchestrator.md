# ADR-002: Sync Orchestrator & Workflow Coordination

- **Status**: APPROVED
- **Date**: 2026-07-31
- **Deciders**: DWIP Enterprise Technical Steering Committee
- **Technical Story**: Centralized orchestration of multi-entity integration synchronization workflows.

---

## Context and Problem Statement

Master data synchronization across complex workshop networks requires multi-entity dependency ordering (e.g. Customers → Vehicles → Job Cards → Claims). Executing uncoordinated parallel sync calls causes foreign key violations, orphan records, and unmonitored failures.

## Decision Outcome

Implemented `SyncOrchestrator`:
- Coordinates `FULL_SYNC`, `INCREMENTAL_SYNC`, `MANUAL_SYNC`, and `BACKGROUND_SYNC` workflows.
- Enforces strict dependency graph ordering.
- Tracks real-time sync progress, publishes `IntegrationEvent` payloads (`SyncStarted`, `SyncCompleted`, `SyncFailed`), and manages background retries and cancellations.
