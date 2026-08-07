---
Document ID: ADR-002
Title: Dual Timeline Engine for Real-Time & Audit Sourcing
Version: 1.1.0
Status: ACCEPTED
Owner: DWIP Core Architecture Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-01
Updated Date: 2026-07-30
Dependencies: DWIP-WOS-001, WOS-CH04
Description: Architectural decision introducing dual timeline sourcing for real-time WebSocket events and SQL audit trails.
---

# ADR-002: Dual Timeline Engine for Real-Time & Audit Sourcing

---

## Context
Workshop execution requires fast in-memory event streaming for WebSocket UI dashboards, while financial auditing demands immutable SQL transaction records.

---

## Decision
Implement a Dual Timeline Engine:
1. **Operational Real-Time Stream**: Powered by in-memory `EventBus` for live bay TAT monitors and WebSocket push updates.
2. **Financial Audit Timeline**: Persisted in MySQL via `OperationalEventRepository` and Drizzle schema for tamper-evident audit logging.

---

## Consequences
- **Positive**: High throughput for UI dashboards with zero audit log latency impact.
- **Negative**: Requires event handler idempotency to prevent duplicate audit records.
