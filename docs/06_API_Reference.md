# DWIP API Reference
**Express API Routes Reference Guide**

## 1. Analytics Platform API (`/api/analytics`)
* **GET `/api/analytics/metrics`**: List all registered metrics definitions.
* **GET `/api/analytics/dimensions`**: List registered dimension filters.
* **POST `/api/analytics/aggregate`**: Compute dynamic aggregations based on historical data.
* **POST `/api/analytics/trend`**: Evaluate trends over comparative periods.

## 2. Customer Experience Platform API (`/api/crm`)
* **GET `/api/crm/customer/:id/360`**: Retrieve Customer 360 profile, timeline events, and loyalty points.
* **GET `/api/crm/fleet/:id/360`**: Retrieve Fleet 360 account profile.
* **POST `/api/crm/leads`**: Register a new customer interest lead.

## 3. Enterprise AI Platform API (`/api/ai`)
* **POST `/api/ai/predict`**: Evaluate predictions (revenue, delays, claims risk).
* **GET `/api/ai/models`**: List all registered AI models in registry.

## 4. Executive Command Center API (`/api/executive`)
* **GET `/api/executive/dashboard/:role`**: Compile consolidated role-based presentations.
