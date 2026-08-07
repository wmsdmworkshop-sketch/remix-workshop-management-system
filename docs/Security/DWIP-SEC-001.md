---
Document ID: DWIP-SEC-001
Title: Master Security Specification
Version: 1.1.0
Status: APPROVED
Owner: DWIP Security Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-30
Updated Date: 2026-07-30
Dependencies: DWIP-DOC-001
Description: Comprehensive security architecture manual detailing JWT authentication, RBAC authorization, field security, and SAIF compliance.
---

# DWIP-SEC-001: Master Security Specification

---

## 1. Authentication & Session Security
- **JWT Verification**: Mandatory JWT authentication header enforcement via global gateway middleware.
- **Bcrypt Password Hashing**: Passwords stored using bcrypt with configurable salt rounds.
- **Active Account Check**: Suspended accounts are immediately blocked from authenticating.

---

## 2. Authorization & RBAC Control
- **10-Step Authorization Engine**: Module-level permission evaluation (`can_view`, `can_edit`).
- **Field-Level Security**: Sensitivity masks applied to financial revenue and PII data fields.
- **Audit Trails**: All system actions logged with IP address, user ID, and timestamp.
