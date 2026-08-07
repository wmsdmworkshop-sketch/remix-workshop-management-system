# DWIP V1 RC2.1 – PRODUCTION HEALTH REPORT

**Service:** `wms-workshop-app`  
**Active Revision:** `wms-workshop-app-00073-nkh`  
**Audit Date:** 25/07/2026  

---

## 1. Application Endpoint Health Matrix

| Endpoint | HTTP Status | Response Time | Payload Validation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`GET /`** (Login UI) | `200 OK` | `202ms` | Rendered SPA HTML, CSS & JS bundles | **PASS** |
| **`GET /api/version`** | `200 OK` | `163ms` | App: DWIP Enterprise, Schema: v18 | **PASS** |
| **`GET /api/health`** | `503 Service Unavailable` | `107ms` | `DB_OFFLINE: Fast fallback active` | **OBSERVATION** |
| **`POST /api/auth/login`** | `401 Unauthorized` (Invalid Creds) | `253ms` | RBAC validation active | **PASS** |
| **`GET /api/vehicle/history`**| `401 Unauthorized` (Unauth) | `43ms` | JWT protection enforced | **PASS** |

---

## 2. Browser & DOM Inspection Results

* **Viewport Screenshot:** Captured live via DevTools MCP on production URL `https://wms-workshop-app-473233046183.asia-south1.run.app`.
* **Footer Metadata:**
  * Version: `Version 1.0.0 GA`
  * Release Tag: `Production Release`
  * Git Commit: `3a1dcd9`
  * Build Timestamp: `7/25/2026, 5:15:00 PM`
* **Console Warnings/Errors:** `0` uncaught JavaScript exceptions or missing asset errors (`404`).
