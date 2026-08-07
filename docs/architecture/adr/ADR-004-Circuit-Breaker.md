# ADR-004: Circuit Breaker & Resiliency Pattern

- **Status**: APPROVED
- **Date**: 2026-07-31
- **Deciders**: DWIP Enterprise Technical Steering Committee
- **Technical Story**: Preventing cascading system failures during external OEM gateway outages.

---

## Context and Problem Statement

When an external OEM platform experiences high latency or outages, repeated blocking requests consume thread pools and cause cascading failures throughout the workshop management system.

## Decision Outcome

Implemented `CircuitBreaker`:
- States: `CLOSED` (Normal execution), `OPEN` (Failures exceeded threshold; requests fast-failed), `HALF_OPEN` (Probe trial state to test recovery).
- Automatically trips to `OPEN` upon consecutive failure threshold, protecting workshop operations during cloud outages.
