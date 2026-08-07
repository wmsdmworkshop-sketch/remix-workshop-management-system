# DWIP API Reference
**Document ID**: DWIP-M-06 | **Version**: 1.0.0-GA | **Author**: Lead Software Engineer

## Table of Contents
1. [Authentication & Authorization](#1-authentication--authorization)
2. [REST Endpoints Catalog](#2-rest-endpoints-catalog)
3. [Error Handling & Code Mappings](#3-error-handling--code-mappings)

---

## Revision History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0-GA | July 18, 2026 | Lead Architect | Initial consolidation for GA release. |

---

## Related Documents
* [docs/master/08_Security_Guide.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/docs/master/08_Security_Guide.md)

---

## 1. Authentication & Authorization
All platform endpoints except login and public telemetry require a `Bearer <token>` HTTP Header. Roles are parsed to verify permissions via the `requirePermission` middleware.

## 2. REST Endpoints Catalog
### Analytics API (`/api/analytics`)
* **POST `/api/analytics/aggregate`**: Generates metrics averages.
  * *Request*: `{ "metricKey": "avg_turnaround_time", "periodStart": "...", "periodEnd": "...", "granularity": "DAILY" }`
  * *Response*: AggregationResult DTO.
* **POST `/api/analytics/trend`**: Compares two timeframes.

### CRM API (`/api/crm`)
* **GET `/api/crm/customer/:id/360`**: Fetches Consolidated Customer 360 profile.
* **POST `/api/crm/leads`**: Creates a prospect lead.

### AI API (`/api/ai`)
* **POST `/api/ai/predict`**: Evaluates prediction models.
  * *Request*: `{ "useCase": "revenue_prediction", "entityId": "SYSTEM" }`
  * *Response*: AIPredictionResult DTO containing confidence score and explainability attributes.

### Executive API (`/api/executive`)
* **GET `/api/executive/dashboard/:role`**: Returns widget configurations.

## 3. Error Handling & Code Mappings
* **400 Bad Request**: Validation failure (defined by AnalyticsValidator).
* **401 Unauthorized**: Missing or expired JWT token.
* **403 Forbidden**: Access denied due to insufficient permissions.
* **404 Not Found**: Target resource missing.
