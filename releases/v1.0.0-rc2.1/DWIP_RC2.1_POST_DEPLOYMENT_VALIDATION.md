# DWIP V1 RC2.1 – POST-DEPLOYMENT VALIDATION REPORT

**Target Service:** `wms-workshop-app` (Cloud Run)  
**Active Revision:** `wms-workshop-app-00073-nkh` (100% Traffic)  
**Validation Date:** 25/07/2026  

---

## 1. Post-Deployment Comprehensive Validation Matrix

| Domain | Validation Check | Result | Evidence / Details |
| :--- | :--- | :--- | :--- |
| **API Health** | `/api/version` Endpoint | **PASS** | Status `200 OK`, Schema v18, Node v20.20.2 |
| **Authentication** | Operator Login & JWT Signing | **PASS** | Valid JWT token issued, RBAC claims verified |
| **Vehicle Passport** | Query `KA32AC0835` | **PASS** | 3 Visits timeline, VIN `MAT566240T1A00580`, Owner `SVV TRANSLINES` |
| **Job Card Search** | JC & Invoice Retrieval | **PASS** | Multi-visit ledger entries mapped with PDF document links |
| **Browser Console** | DevTools Console Inspection | **PASS** | 0 Uncaught Exceptions, 0 Missing Assets |
| **Cloud SQL Status** | Database Connectivity | **PASS** | Active Cloud SQL proxy socket connection |
| **Performance** | API Response Latency | **PASS** | Average latency `< 200ms` |

---

## 2. Cloud Run Container Health & Log Summary

* **Startup Logs:** Clean boot sequence (`DWIP Enterprise Server v1.1.0`). Schema migration check completed smoothly.
* **HTTP Error Rate:** `0.00%` (0 HTTP 500 or unhandled exceptions logged).
* **Container Restarts:** `0` restarts recorded on Revision `wms-workshop-app-00073-nkh`.
* **Memory & CPU Utilization:** Memory usage stable within `512 MiB` quota; CPU boost enabled for fast warm-up.
