---
Document ID: DWIP-DB-002
Title: DWIP Enterprise Column-Level Data Dictionary
Version: 1.0
Status: FROZEN
Owner: DWIP Core Platform & Database Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-31
Updated Date: 2026-07-31
Dependencies: DWIP-DB-001
Description: Comprehensive column-level data dictionary for all 8 VOS foundation database tables.
---

# DWIP-DB-002: Master Data Dictionary

---

## Table 1: `vos` (Master Vehicle Operational Sessions)

| Column Name | SQL Type | Drizzle Type | Nullable | Primary / Index | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | `varchar` | No | PK | Internal UUID primary key |
| `public_id` | VARCHAR(100) | `varchar` | No | UNIQUE | Public external identifier token |
| `company_id` | VARCHAR(50) | `varchar` | No | INDEX | Multi-tenant company identifier |
| `dealer_id` | VARCHAR(50) | `varchar` | No | INDEX | Multi-tenant dealer identifier |
| `vos_number` | VARCHAR(100) | `varchar` | No | UNIQUE | Format: `{Dealer}-{Branch}-{FY}-{Seq}` |
| `branch_id` | VARCHAR(50) | `varchar` | No | INDEX | Workshop branch location reference |
| `vehicle_id` | VARCHAR(50) | `varchar` | No | INDEX | Internal vehicle entity UUID |
| `vehicle_external_id` | VARCHAR(100) | `varchar` | Yes | - | External ERP/OEM vehicle identifier |
| `customer_id` | VARCHAR(50) | `varchar` | No | INDEX | Internal customer entity UUID |
| `customer_external_id` | VARCHAR(100) | `varchar` | Yes | - | External ERP/OEM customer identifier |
| `visit_type` | VARCHAR(50) | `varchar` | No | - | Visit classification enum |
| `commercial_type` | VARCHAR(50) | `varchar` | No | - | Billing classification enum |
| `entry_source` | VARCHAR(50) | `varchar` | No | - | Intake source enum (`MANUAL`, `ANPR`, `OCR`, `API`, `MOBILE`, `TMSA`) |
| `is_breakdown` | TINYINT(1) | `boolean` | No | - | Flag indicating roadside breakdown |
| `current_state` | VARCHAR(50) | `varchar` | No | INDEX | Active VOS workflow state |
| `current_owner` | VARCHAR(50) | `varchar` | No | - | Assigned owner user/role ID |
| `priority` | VARCHAR(20) | `varchar` | No | - | Priority enum (`LOW`, `NORMAL`, `HIGH`, `VIP`, `EMERGENCY`, `ROAD_BLOCKED`) |
| `risk_level` | VARCHAR(20) | `varchar` | No | - | Risk level enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) |
| `risk_score` | INT | `int` | No | - | Integer risk score (0-100) |
| `registration_number` | VARCHAR(50) | `varchar` | No | - | Immutable VRN snapshot |
| `chassis_number` | VARCHAR(100) | `varchar` | No | - | Immutable Chassis/VIN snapshot |
| `odometer_at_gate_in` | INT | `int` | Yes | - | Immutable intake odometer |
| `driver_name` | VARCHAR(100) | `varchar` | Yes | - | Immutable driver name snapshot |
| `driver_mobile` | VARCHAR(30) | `varchar` | Yes | - | Immutable driver phone snapshot |
| `customer_name` | VARCHAR(150) | `varchar` | Yes | - | Immutable customer name snapshot |
| `version` | INT | `int` | No | - | Optimistic locking version counter |
| `is_deleted` | TINYINT(1) | `boolean` | No | - | Soft delete flag |

---

## Table 2: `vos_state_history`

| Column Name | SQL Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | No | Primary Key UUID |
| `vos_id` | VARCHAR(36) | No | FK -> `vos.id` |
| `from_state` | VARCHAR(50) | No | State prior to transition |
| `to_state` | VARCHAR(50) | No | State after transition |
| `time_spent_seconds` | INT | Yes | Duration spent in previous state in seconds |
| `changed_by` | VARCHAR(50) | No | User ID who executed transition |
