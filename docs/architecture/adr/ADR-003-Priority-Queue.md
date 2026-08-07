# ADR-003: Priority Queue & Persistent Offloading

- **Status**: APPROVED
- **Date**: 2026-07-31
- **Deciders**: DWIP Enterprise Technical Steering Committee
- **Technical Story**: Prioritizing critical operational sync requests over routine background synchronization.

---

## Context and Problem Statement

Under high workshop load or intermittent network connectivity, routine background master data synchronization could starve real-time breakdown gate entries or emergency job card status updates if processed in simple FIFO order.

## Decision Outcome

Implemented `PrioritySyncQueue`:
- Enforces 5-tier priority scheduling: `CRITICAL` (1), `HIGH` (2), `NORMAL` (3), `LOW` (4), `BACKGROUND` (5).
- Ensures emergency breakdown and gate entry requests preempt background synchronization tasks.
- Offloads failed requests to `FailedRequestQueue` with serialized payloads, checksums, and retry tracking.
