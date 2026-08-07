---
Document ID: DWIP-DOC-004
Title: DWIP Enterprise Versioning Policy
Version: 1.1.0
Status: APPROVED
Owner: DWIP Release Governance Committee
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-30
Updated Date: 2026-07-30
Dependencies: DWIP-DOC-001
Description: Semantic versioning rules, module stability matrix, and deprecation schedules.
---

# DWIP Enterprise Versioning Policy

DWIP Enterprise adheres to **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`).

---

## Versioning Scheme

- **MAJOR (`x.0.0`)**: Incompatible API schema changes, fundamental architectural shifts, or major state machine revisions.
- **MINOR (`1.x.0`)**: Backward-compatible feature additions, new Core Engines, new Integration Layer connectors, or platform enhancements (e.g. `v1.1.0` - Sprint IL-001).
- **PATCH (`1.1.x`)**: Backward-compatible bug fixes, security patches, performance tuning, or telemetry updates.

---

## Stability Matrix

| Package / Module | Stability | Deprecation Policy |
| :--- | :--- | :--- |
| **Core Platform Engines (`src/core/platform/`)** | Stable (v1.1.0) | 2 Minor Version Notice |
| **Integration Layer Interfaces (`src/integrations/common/`)** | Stable (v1.1.0) | 2 Minor Version Notice |
| **Workshop Operating System (WOS)** | Stable (v1.0.0) | 3 Minor Version Notice |
| **REST API (`/api/platform/*`)** | Stable (v1.1.0) | 2 Minor Version Notice |
