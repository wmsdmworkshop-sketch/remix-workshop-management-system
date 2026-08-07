# DWIP Database Architecture
**Document ID**: DWIP-M-04 | **Version**: 1.0.0-GA | **Author**: Lead Database Engineer

## Table of Contents
1. [Relational Storage Strategy](#1-relational-storage-strategy)
2. [Data Tables Mappings](#2-data-tables-mappings)
3. [Normalization & Integrity Mappings](#3-normalization--integrity-mappings)

---

## Revision History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0-GA | July 18, 2026 | Lead Architect | Initial consolidation for GA release. |

---

## Related Documents
* [docs/master/05_ER_Diagrams.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/docs/master/05_ER_Diagrams.md)

---

## 1. Relational Storage Strategy
DWIP leverages MySQL/PostgreSQL storage databases, using Drizzle ORM to maintain schemas. A local file-backed JSON database (`workshop_db.json`) operates as a cache on Edge nodes, synchronized via transaction hooks.

## 2. Data Tables Mappings
* **job_cards**: Primary transaction table tracking numbers, statuses, VINs, and estimated rates.
* **employees**: Stores personnel details, certifications, basic salary, and system roles.
* **bays**: Physical workshop locations and availability flags.
* **job_technician_maps**: Many-to-many lookup mapping technicians to jobs.
* **job_revenues**: Tracks final billing records, parts rates, and labor subtotals.
* **job_revenue_split_details**: Holds finalized technician split amounts computed by the Revenue Split Engine.

## 3. Normalization & Integrity Mappings
* **3NF Adherence**: Separate master tables for alerts, configurations, employees, and bays prevent duplicate record errors.
* **Foreign Keys**: Cascading updates are enforced on relations.
* **Transaction Rollbacks**: TransactionManager guarantees atomic operations across tables.
