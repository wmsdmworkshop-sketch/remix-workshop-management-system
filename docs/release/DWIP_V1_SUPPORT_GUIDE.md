# DWIP V1 – Long-Term Support & Operational Maintenance Guide

## Purpose
Defines the L1/L2/L3 support model, incident management workflow, change request procedures, maintenance windows, and hotfix release protocols for DWIP V1 in production.

## Support Level Model

| Tier | Scope | Responsibilities | Target SLA |
|---|---|---|---|
| **L1 Support** | Helpdesk & User Assistance | Password resets, navigation queries, browser troubleshooting | `< 15 Mins` |
| **L2 Support** | Application Operations | Data reconciliation queries, user permission updates, API logs | `< 2 Hours` |
| **L3 Support** | Core Engineering / DevOps | Critical bug hotfixes, database connection pool issues, infrastructure | `< 1 Hour (Critical)` |

## Maintenance & Monitoring Schedule
* **Automated Database Backups:** Daily at 02:00 AM IST (7-day retention).
* **Maintenance Windows:** Sundays 01:00 AM – 03:00 AM IST.
* **Health Check Endpoint:** `GET /api/ready` (Polled every 60 seconds).

## Semantic Release Guidance
* **`v1.0.x` (Hotfix):** Emergency patches for production regressions (No DB schema changes allowed).
* **`v1.1.0` (Enhancements):** Minor version updates introducing backwards-compatible features.
* **`v2.0.0` (Major):** Major architectural evolutions.
