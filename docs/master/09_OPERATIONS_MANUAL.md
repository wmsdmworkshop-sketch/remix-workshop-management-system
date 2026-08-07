# DWIP Operations Manual
**Document ID**: DWIP-M-09 | **Version**: 1.0.0-GA | **Author**: Lead Systems Operations Engineer

## Table of Contents
1. [Daily Operations Procedures](#1-daily-operations-procedures)
2. [Workshop Monitor Telemetry](#2-workshop-monitor-telemetry)
3. [Backup & Maintenance Intervals](#3-backup--maintenance-intervals)

---

## Revision History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0-GA | July 18, 2026 | Lead Architect | Initial consolidation for GA release. |

---

## Related Documents
* [docs/master/10_Administrator_Guide.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/docs/master/10_Administrator_Guide.md)

---

## 1. Daily Operations Procedures
* **Morning Health Check**: Confirm Express application listener is active on port 3000. Check local database sync status.
* **Technician Check-in**: Verify workforce attendance logs.

## 2. Workshop Monitor Telemetry
* **Live TAT Monitoring**: Access dashboard charts to monitor average repair time trends.
* **Exceptions & Alerts**: Audit the `alertConfigs` dashboard for any active SLA warning flags (e.g. `ETD_WARN`).

## 3. Backup & Maintenance Intervals
* **Database Backup**: Standard automated dump scripts run daily at 01:00 AM.
* **Logs Rotation**: Compress and archive event bus log files weekly.
