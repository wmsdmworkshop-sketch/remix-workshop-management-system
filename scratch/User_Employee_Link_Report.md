# User Employee Link Report

**Date:** 2026-07-11  
**Project:** DWIP v2 Foundation Stabilization  
**Phase:** Sprint 1 — Master Data Cleanup (CR-001)

---

## 1. User-Employee Link Analysis

| User ID | Username | Role | Linked Employee ID | Linked Employee Name | Status |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 6 | `qadeer` | `billing` | 6 | FAKIRAAPA | ❌ MANUAL REVIEW REQUIRED |
| 7 | `sahsi` | `service_advisor` | 7 | Shashi | ✅ MATCH |
| 8 | `RAGU` | `Supervisor` | 8 | HANNAMANTHRAYA | ❌ MANUAL REVIEW REQUIRED |
| 9 | `manju` | `Warranty` | 9 | HUNCHIRAY | ❌ MANUAL REVIEW REQUIRED |
| 10 | `PK` | `Supervisor` | 10 | JAGADISH | ❌ MANUAL REVIEW REQUIRED |
| 11 | `AHMED` | `Service Manager` | 11 | LOKU | ❌ MANUAL REVIEW REQUIRED |
| 12 | `mustafa` | `service_advisor` | 12 | Mustafa | ✅ MATCH |
| 13 | `chetan` | `Warranty` | 13 | MALLINATH | ❌ MANUAL REVIEW REQUIRED |
| 14 | `developer` | `developer` | 0 | N/A | ℹ️ SYSTEM ACCOUNT (No Employee) |
| 15 | `admin` | `admin` | 0 | N/A | ℹ️ SYSTEM ACCOUNT (No Employee) |
| 18 | `afroz_rp` | `reception` | 0 | N/A | ℹ️ SYSTEM ACCOUNT (No Employee) |
| 19 | `spares_sdm` | `service_manager` | 0 | N/A | ℹ️ SYSTEM ACCOUNT (No Employee) |

---

## 2. Action Plan for Manual Review

1.  **Chetan:** No employee record for Chetan exists. A new employee profile must be created first before mapping his user ID.
2.  **Qadeer, Ragu, Manju, PK, Ahmed:** Mappings must be updated to reference correct employee IDs (2, 26, 14, 25, 40 respectively) after manager approval.
3.  **Shashi username typo:** The user account username has a typo `sahsi` but the employee record name is correct. This is flagged for rename.
