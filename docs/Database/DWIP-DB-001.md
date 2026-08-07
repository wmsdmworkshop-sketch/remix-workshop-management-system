---
Document ID: DWIP-DB-001
Title: Canonical Database Architecture Specification
Version: 1.0
Status: FROZEN
Owner: DWIP Core Platform & Database Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-30
Updated Date: 2026-07-31
Dependencies: None
Description: Canonical frozen database architecture specification for DWIP Enterprise Workshop Operating System (WOS).
---

# DWIP-DB-001: Master Database Architecture Specification

**Status**: FROZEN (v1.0)  
**ORM Framework**: Drizzle ORM (MySQL 8.0+)  

---

## 1. Executive Summary
DWIP-DB-001 v1.0 is the canonical, frozen database foundation for the DWIP Enterprise Workshop Operating System (WOS). The Vehicle Operational Session (`vos`) is established as the primary operational entity of the platform.

---

## 2. Frozen Table Directory

| Table Name | Description | Key Columns | Primary Key |
| :--- | :--- | :--- | :--- |
| `vos` | Master Vehicle Operational Sessions | `id`, `public_id`, `vos_number`, `branch_id`, `vehicle_id`, `customer_id`, `current_state` | `id` |
| `vos_state_history` | State transition audit log | `id`, `public_id`, `vos_id`, `from_state`, `to_state`, `time_spent_seconds` | `id` |
| `vos_owner_history` | Ownership handover log | `id`, `public_id`, `vos_id`, `previous_owner`, `new_owner`, `handover_type` | `id` |
| `vos_timeline` | Timeline & SLA milestones log | `id`, `public_id`, `vos_id`, `timeline_category`, `event_type`, `sla_status` | `id` |
| `vos_configuration_reference` | Branch ruleset config snapshot | `id`, `public_id`, `vos_id`, `branch_id`, `config_version`, `workflow_version` | `id` |
| `vos_links` | Generic module relationship links | `id`, `public_id`, `vos_id`, `entity_module`, `entity_type`, `entity_id`, `relationship_type` | `id` |
| `vos_attributes` | Telemetry & diagnostic attributes | `id`, `public_id`, `vos_id`, `attribute_name`, `attribute_value`, `unit`, `confidence_score` | `id` |
| `vos_tags` | Operational tagging & categorization | `id`, `public_id`, `vos_id`, `tag_name`, `tag_category` | `id` |

---

## 3. Governance Guarantees
- **Primary Operational Entity**: VOS is the primary entity. CRM and Job Cards are linked via `vos_links`.
- **Multi-Tenant Isolation**: Multi-tenancy enforced by `company_id` and `dealer_id`.
- **Immutable Intake Snapshots**: Vehicle, Driver, Customer, and Intake snapshots captured at Gate In are immutable.
- **Data Classification**: Enforced via `data_classification` (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`).
