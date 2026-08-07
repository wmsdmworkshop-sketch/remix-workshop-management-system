---
Document ID: ADR-003
Title: Operational Session & Identity Context Persistence Strategy
Version: 1.1.0
Status: ACCEPTED
Owner: DWIP Security & Core Platform Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-20
Updated Date: 2026-07-30
Dependencies: DWIP-WOS-001, WOS-CH02
Description: Architectural decision adopting JWT payload sessions backed by UserRepository checks for session continuity.
---

# ADR-003: Operational Session & Identity Context Persistence Strategy

---

## Context
Multi-role workshop staff (advisors, supervisors, technicians, billing cashiers) frequently switch devices or refresh browsers while managing active job cards.

---

## Decision
Maintain active operational session context in JWT token payloads backed by `localStorage` (`wms_user`, `wms_token`) with server-side validation against `UserRepository` on every API invocation.

---

## Consequences
- **Positive**: Seamless session recovery across network re-connections. Instant role permission updates upon admin edit.
- **Negative**: Requires token expiration enforcement and explicit revocation hooks.
