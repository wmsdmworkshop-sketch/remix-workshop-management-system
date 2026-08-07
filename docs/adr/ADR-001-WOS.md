---
Document ID: ADR-001
Title: Adoption of Workshop Operating System Architecture
Version: 1.1.0
Status: ACCEPTED
Owner: DWIP Core Architecture Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-06-15
Updated Date: 2026-07-30
Dependencies: DWIP-WOS-001
Description: Architectural decision recording the adoption of an event-driven Workshop Operating System core.
---

# ADR-001: Adoption of Workshop Operating System Architecture

---

## Context
Commercial workshop operations require real-time visibility, deterministic job card state management, and strict role-based access control without monolithic UI tight coupling.

---

## Decision
Adopt an event-driven Workshop Operating System (WOS) architecture featuring a 12-state workflow machine, decoupled core platform engines, and dedicated domain service repositories.

---

## Consequences
- **Positive**: Strict state machine prevents illegal workflow bypasses. Modular engines allow independent scaling.
- **Negative**: Requires rigorous event schema versioning and disciplined developer onboarding.
