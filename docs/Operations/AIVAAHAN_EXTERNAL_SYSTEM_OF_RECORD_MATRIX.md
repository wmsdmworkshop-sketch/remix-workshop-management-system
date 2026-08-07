# AIVAAHAN_EXTERNAL_SYSTEM_OF_RECORD_MATRIX.md — Master Data Ownership & System of Record Matrix

## 📌 Executive Summary

To prevent data corruption, duplicate records, and split-brain states across dealership systems, this document defines the **Authoritative System of Record (SoR)** for every data domain in the AiVaahan DWIP ecosystem.

---

## 🏛️ System of Record (SoR) Governance Matrix

| Data Domain | Authoritative System of Record | Local DWIP Data Copy | DWIP Synchronization Strategy | Ownership & Mutability Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Vehicle Master & Specs** | **Tata Motors CRM / TMSA** | `vehicle_master`, `stg_vehicle_master` | Synchronized on Gate-In; read-heavy | Tata CRM is Master. DWIP updates local odometer & gate-in notes only. |
| **Customer Master & AMC** | **Tata Motors CRM / FleetEdge** | `customer_passports`, `fleet_passports` | Read on Gate-In; sync on update | Customer identity mastered in CRM. Local mobile updates sync back. |
| **VOS Real-Time Session** | **DWIP Enterprise Platform** | `vos`, `vos_state_history`, `vos_timeline` | **DWIP IS MASTER (Local Master)** | DWIP owns live VOS state (`GATE_IN` $\rightarrow$ `WORK_IN_PROGRESS` $\rightarrow$ `GATE_OUT`). |
| **CRM Official Job Card** | **Tata Motors CRM** | `job_cards`, `job_card_master` | Synchronized via `SyncOrchestrator` | CRM owns official OEM Job Card number (`job_card_no`). |
| **DWIP Temporary Job Card**| **DWIP Enterprise Platform** | `job_cards` (`external_reference`) | Reconciled to CRM when online | DWIP owns temporary job record (`DWIP-TEMP-XXXX`) when offline. |
| **Parts Master & Pricing** | **Salesforce DMS** | `parts_models.ts`, local parts DB | Daily sync / live price lookup | Salesforce DMS is Master for part numbers, MRP, and stock counts. |
| **Warranty Claims & Rules** | **Tata Motors Warranty Portal** | `warranty_claims`, `warranty-strategy.ts`| Live API claim validation | OEM Warranty Portal owns final claim approval & financial settlement. |
| **Operational Telemetry/Photos**| **DWIP Enterprise Platform** | `tbl_evidence`, `vos_attributes` | Local storage $\rightarrow$ cloud sync | DWIP Vault is Master for media, ANPR photos, and mobile GPS tracks. |
| **Financial Invoice & GST** | **Salesforce DMS / Billing** | `invoices`, `job_revenues` | Pushed to DMS upon cashier payment | Salesforce DMS is Master for official accounting ledger and GST filings. |

---

## 🔄 Data Mutability Rules

1. **External Mastered Domains** (Vehicle Specs, AMC Contracts, OEM Warranty Rates, Part Pricing):
   - **READ-ONLY in DWIP Mobile UI**.
   - Fields cannot be overridden by operational users unless an explicit audit-logged local exception is created.
2. **Local Mastered Domains** (Live VOS State, Technician Timers, QC Pass/Fail, Odometer Photos, Mobile GPS):
   - **MUTABLE IN DWIP**.
   - DWIP is the authoritative System of Record. External systems consume these events via integration APIs.
