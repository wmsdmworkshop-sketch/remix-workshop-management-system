---
Document ID: DWIP-NAMING-001
Title: DWIP Enterprise Database & Code Naming Standards
Version: 1.0
Status: APPROVED
Owner: DWIP Architecture Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-31
Updated Date: 2026-07-31
Dependencies: DWIP-DB-001
Description: Standardized naming conventions for database tables, columns, indexes, foreign keys, and TypeScript symbols.
---

# DWIP-NAMING-001: Naming Standards

---

## 1. Database Naming Standards
- **Table Names**: Lowercase snake_case, singular or domain entity plural (`vos`, `vos_state_history`, `vos_links`).
- **Column Names**: Lowercase snake_case (`vos_number`, `branch_id`, `created_at`).
- **Primary Keys**: `id` (`VARCHAR(36)` UUID v4).
- **Foreign Keys**: Column named `<target_table_singular>_id` with constraint `fk_<source_table>_<target_table>`.
- **Indexes**: Named `idx_<table_short>_<column_descriptors>` or `uq_<table_short>_<column_descriptors>`.

---

## 2. TypeScript / Drizzle Naming Standards
- **Drizzle Table Symbols**: camelCase (`vosMaster`, `vosStateHistoryTable`, `vosLinksTable`).
- **Interfaces**: PascalCase prefixed with `I` (`IVos`, `IVosStateHistory`).
- **Enums**: PascalCase with UPPERCASE keys (`VisitType.NORMAL_SERVICE`, `VosPriority.HIGH`).
