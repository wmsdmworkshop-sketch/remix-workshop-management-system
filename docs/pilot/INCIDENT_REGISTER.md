# DWIP V1 – Controlled Pilot Incident Register

## Purpose
Tracking and logging of all operational incidents, technical queries, and observations encountered during the 14-day Primary Workshop pilot deployment.

## Incident Log Table

| Incident ID | Date | Module | Description | Severity | Root Cause | Temporary Fix | Permanent Fix | Status |
|---|---|---|---|---|---|---|---|---|
| `INC-001` | Day 02 | Customer Portal | Brief latency spike on mobile PDF export | **LOW** | Initial cold-start cache allocation | Standard SWR cache warming | SWR Cache pre-warmed | **RESOLVED** |
| `INC-002` | Day 06 | Gate Entry | ANPR camera string whitespace padding | **LOW** | Hardware OCR trailing space | `trim()` applied in intake UI | Added string normalization | **RESOLVED** |
| `INC-003` | Day 11 | FIP Fleet | Delayed refresh on multi-vehicle AMC status | **LOW** | Large fleet join overhead | Added index `idx_amc_fleet` | Database query index optimized | **RESOLVED** |

## Summary Statistics
* **Critical Severity Incidents:** 0
* **High Severity Incidents:** 0
* **Medium Severity Incidents:** 0
* **Low Severity Incidents:** 3 (All 100% Resolved)
* **Open Incidents Remaining:** **0**
