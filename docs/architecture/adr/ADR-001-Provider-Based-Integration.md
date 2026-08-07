# ADR-001: Provider-Based Integration Architecture

- **Status**: APPROVED
- **Date**: 2026-07-31
- **Deciders**: DWIP Enterprise Technical Steering Committee
- **Technical Story**: Decouple DWIP Enterprise Core from specific OEM integrations (TMSA, DMS, FleetEdge).

---

## Context and Problem Statement

DWIP Enterprise requires seamless integration with multiple external OEM platforms (e.g. Tata Motors Service App, Dealer Management Systems, Telematics platforms). Hardcoding vendor-specific endpoint URLs or payload transformations inside core workshop microservices leads to tight coupling, high regression risks, and inability to plug in new OEM providers without codebase modifications.

## Decision Drivers

- Pluggable provider architecture.
- Zero OEM vendor lock-in.
- Strictly decoupled core platform and domain models.
- Versioned API contract enforcement.

## Considered Options

1. **Option A**: Direct integration inside domain services (Rejected: Causes vendor coupling).
2. **Option B**: Provider-Based Adapter Architecture via `IOemAdapter` & `OemProviderRegistry` (Chosen).

## Decision Outcome

Chosen **Option B**:
- Implemented `OemProviderRegistry` registering `IOemAdapter` providers dynamically by `providerId`.
- External OEM platforms plug in as decoupled adapter implementations conforming to versioned contracts (`v1`).
- Core gateway routes operations via dependency injection without vendor-specific branching logic.
