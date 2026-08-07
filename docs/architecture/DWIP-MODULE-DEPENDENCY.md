---
Document ID: DWIP-MOD-001
Title: DWIP Enterprise Module Dependency Matrix
Version: 1.0
Status: APPROVED
Owner: DWIP Architecture Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-31
Updated Date: 2026-07-31
Dependencies: DWIP-DB-001
Description: Architecture matrix detailing module dependencies, integration boundaries, and VOS core central positioning.
---

# DWIP Module Dependency Matrix

---

## 1. Primary Entity Centric Model

```
                ┌──────────────────────────────────────┐
                │  Vehicle Operational Session (VOS)   │
                │        Primary Entity Kernel         │
                └──────────────────┬───────────────────┘
                                   │ (vos_links)
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼───────┐          ┌───────▼───────┐          ┌───────▼───────┐
│  CRM Module   │          │Job Card Module│          │ Warranty Mod  │
└───────────────┘          └───────────────┘          └───────────────┘
```

---

## 2. Dependency Matrix

| Module | Core Entity | Depends On VOS | Linkage Key | Integration Layer Connector |
| :--- | :--- | :--- | :--- | :--- |
| **VOS Core** | `vos` | **Primary Entity** | Primary Key `id` | Standard Platform |
| **CRM** | `crm_lead` | Yes (Linked) | `vos_links` (`entity_module: 'CRM'`) | TMSA / DMS |
| **Job Card** | `job_card` | Yes (Linked) | `vos_links` (`entity_module: 'SERVICE'`) | TMSA / DMS |
| **Parts & Warranty**| `warranty_claim`| Yes (Linked) | `vos_links` (`entity_module: 'WARRANTY'`) | DMS |
| **Billing & Cashier**| `invoice` | Yes (Linked) | `vos_links` (`entity_module: 'FINANCE'`) | DMS |
