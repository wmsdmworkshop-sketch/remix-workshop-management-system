# DWIP Security Guide
**Document ID**: DWIP-M-08 | **Version**: 1.0.0-GA | **Author**: Lead Security Engineer

## Table of Contents
1. [Authentication Mechanism](#1-authentication-mechanism)
2. [Authorization & Role-Based Access Control (RBAC)](#2-authorization--role-based-access-control-rbac)
3. [Audit Logging Strategy](#3-audit-logging-strategy)
4. [OWASP Top 10 Protections](#4-owasp-top-10-protections)

---

## Revision History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0-GA | July 18, 2026 | Lead Architect | Initial consolidation for GA release. |

---

## Related Documents
* [docs/master/06_API_REFERENCE.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/docs/master/06_API_REFERENCE.md)

---

## 1. Authentication Mechanism
* **Employee Authentication**: Handled via JWT tokens containing user ID, role, and permission scope, signed using `JWT_SECRET`.
* **Customer Portal**: Employs passwordless OTP flow signed using `CUSTOMER_JWT_SECRET`.

## 2. Authorization & Role-Based Access Control (RBAC)
DWIP employs granular permissions mapping:
* **roles**: Defined configurations for Workshop Manager, Technician, and CEO.
* **middleware**: `requirePermission(module, action)` matches the request token claims against the registered roles rules.

## 3. Audit Logging Strategy
All updates to job cards, financial claims, and configuration overrides generate operational audit logs saved locally and synchronized.

## 4. OWASP Top 10 Protections
* **SQL Injection**: Prevented using parameterized sql templates via mysql2 and Drizzle ORM.
* **XSS**: Input variables are sanitized before persistence.
* **Rate Limiting**: Enforced on customer OTP endpoints using `express-rate-limit`.
