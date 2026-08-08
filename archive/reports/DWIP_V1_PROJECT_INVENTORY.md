# DWIP V1 – FINAL PROJECT INVENTORY

---

## 1. Inventory Summary

* **Total Project Files:** 184 Files
* **Total Lines of Code (LOC):** ~68,450 Lines
* **Database Tables:** 48 Relational Tables
* **API Routes:** 38 Certified Endpoints
* **React UI Components:** 24 Modules & Panels
* **Documentation Files:** 17 Comprehensive Reports

---

## 2. Component Inventory Breakdown

### A. Core Backend Modules & Services
* `server.ts` — Main Express API server & route handlers (~8,850 LOC)
* `src/db/index.ts` — MySQL pool wrapper & query retry proxy
* `src/db/schema.ts` — Drizzle ORM native schema definitions (~2,416 LOC)
* `src/engines/vehicle-passport/index.ts` — Vehicle Passport™ Facade (~733 LOC)
* `src/engines/vehicle-passport/history-repository.ts` — Detailed history repo (~156 LOC)
* `src/engines/vehicle-passport/timeline-engine.ts` — Timeline builder
* `src/engines/vehicle-passport/ai-health-engine.ts` — Rule-based vehicle health engine
* `rc2_etl_orchestrator.ts` — Certified DMS ETL Orchestrator (~393 LOC)

### B. React Frontend UI Panels (`src/components/`)
* `VehiclePassport.tsx` — 360° Vehicle Passport™ Dossier UI
* `WorkshopDashboard.tsx` — Real-time Workshop Command Center
* `JobCardManager.tsx` — Digital Job Card & Work Order Engine
* `GateEntryManager.tsx` — ANPR & Gate Entry Registry
* `ProductivityDashboard.tsx` — Technician KPI & Revenue Allocation Panel
* `ActiveBayTatMonitor.tsx` — Bay SLA & TAT Monitor
* `BreakdownControlRoom.tsx` — FIP Breakdown & Recovery Panel
* `FIPControlPanel.tsx` — Fleet Passports & AMC Contract Tracking
* `CustomerPortal.tsx` — Individual & Fleet Customer Portal

---

## 3. Relational Database Tables (`railway` / Cloud SQL)

`vehicle_master`, `service_history`, `invoices`, `job_cards`, `vehicle_passports`, `vehicle_events`, `vehicle_documents`, `vehicle_modifications`, `vehicle_repairs`, `vehicle_accidents`, `vehicle_parts_history`, `vehicle_ownership_history`, `vehicle_certificates`, `customer_passports`, `fleet_passports`, `driver_passports`, `fleet_amc_contracts`, `fleet_breakdowns`, `fleet_opportunities`, `ownership_timeline`, `digital_approvals`, `communication_logs`, `customer_feedback`, `stg_vehicle_master`, `stg_service_history`, `stg_invoice_history`, `import_batch`, `import_exception`, `users`, `roles`, `modules`, `role_permissions`, `user_overrides`, `user_delegations`, `security_audit_logs`, `employees`, `bays`, `sr_types`, `revenue_splits`, `user_access_master`, `fsb_master`, `gate_entries`, `job_technician_maps`, `job_revenues`, `job_revenue_split_details`, `carry_forward_logs`, `rework_logs`, `workshops`.
