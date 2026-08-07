# DWIP V1 – FINAL ARCHITECTURE SNAPSHOT

---

## 1. System Architecture Snapshot

```
+-------------------------------------------------------------------------+
|                         CLIENT LAYER (BROWSER)                          |
|         React 19 / Vite / TailwindCSS / Lucide Icons / Recharts         |
+-------------------------------------------------------------------------+
                                     │  (HTTPS / REST APIs)
                                     ▼
+-------------------------------------------------------------------------+
|                          SERVER & API GATEWAY                           |
|      Node.js / Express Server / JWT Auth / SWR Cache / Compression      |
+-------------------------------------------------------------------------+
                                     │
       ┌─────────────────────────────┼─────────────────────────────┐
       ▼                             ▼                             ▼
+---------------+           +---------------+           +---------------+
| PASSPORT      |           | WORKSHOP      |           | FLEET (FIP)   |
| ENGINE        |           | ENGINE        |           | ENGINE        |
+---------------+           +---------------+           +---------------+
       │                             │                             │
       └─────────────────────────────┼─────────────────────────────┘
                                     ▼
+-------------------------------------------------------------------------+
|                        PERSISTENCE & DATA LAYER                         |
|   MySQL 8.0 (`railway` / Cloud SQL) + Drizzle ORM + Connection Proxy    |
+-------------------------------------------------------------------------+
```

---

## 2. Certified Entity-Relationship (ER) Topology

```
+------------------+         1:N         +---------------------+
|  vehicle_master  | ------------------->|   service_history   |
| (Chassis Number) |                     |   (Service Request) |
+------------------+                     +---------------------+
         │                                          │
         │ 1:N                                      │ 1:1
         ▼                                          ▼
+------------------+                     +---------------------+
|     invoices     |                     |      job_cards      |
|  (Invoice No)    |                     |    (Job Card No)    |
+------------------+                     +---------------------+
```

---

## 3. Security & Authentication Architecture
* **Authentication:** Stateless Dual JWT System (`JWT_SECRET` for Workshop Personnel, `CUSTOMER_JWT_SECRET` for Customer Portal).
* **Authorization:** Enterprise Fine-Grained Role Permissions (`role_permissions`, `user_overrides`, `user_delegations`) backed by full Security Audit Logs (`security_audit_logs`).
