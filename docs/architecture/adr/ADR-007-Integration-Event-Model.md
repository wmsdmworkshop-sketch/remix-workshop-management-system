# ADR-007: Integration Event Model & Publisher

- **Status**: APPROVED
- **Date**: 2026-07-31
- **Deciders**: DWIP Enterprise Technical Steering Committee
- **Technical Story**: Decoupled event-driven notification of integration lifecycle state changes.

---

## Context and Problem Statement

Downstream workshop modules (Audit, Command Center, Telematics, Monitoring) require real-time visibility into integration gateway events without polling or direct service coupling.

## Decision Outcome

Implemented `IntegrationEventPublisher`:
- Dispatches typed integration events:
  - `SyncStarted`: Triggered at onset of sync execution.
  - `SyncCompleted`: Fired upon successful synchronization completion.
  - `SyncFailed`: Dispatched when sync terminates with error.
  - `ConflictDetected`: Fired when local vs cloud data collision occurs.
  - `TokenRefreshed`: Dispatched on OAuth2 token renewal.
  - `QueueProcessed`: Fired upon priority queue processing cycle.
