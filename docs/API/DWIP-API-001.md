---
Document ID: DWIP-API-001
Title: Master REST API Reference Specification
Version: 1.1.0
Status: APPROVED
Owner: DWIP Core Architecture Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-30
Updated Date: 2026-07-30
Dependencies: DWIP-DOC-001, DWIP-DB-001
Description: Complete REST API endpoints reference including Workshop domain controllers and `/api/platform/*` endpoints.
---

# DWIP-API-001: Master REST API Reference Specification

---

## 1. Authentication
All requests require a valid JWT token in the `Authorization` header except public endpoints:

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 2. Integration Layer API Endpoints (`/api/platform/*`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/platform/metrics` | Retrieve overall platform monitoring summary |
| `GET` | `/api/platform/systems` | List external connector configurations |
| `PUT` | `/api/platform/systems/:code` | Update external connector settings |
| `POST` | `/api/platform/systems/:code/toggle` | Enable or disable an integration system |
| `GET` | `/api/platform/sync/queue` | Query synchronization queue items |
| `POST` | `/api/platform/sync/retry` | Trigger sync queue retry execution |
| `GET` | `/api/platform/logs` | Search API interaction audit log trace |
| `GET` | `/api/platform/health` | Run health diagnostics and endpoint pings |
| `GET` | `/api/platform/cache` | Get L1/L2 cache stats and drivers |
| `POST` | `/api/platform/cache/clear` | Purge all platform cache entries |
