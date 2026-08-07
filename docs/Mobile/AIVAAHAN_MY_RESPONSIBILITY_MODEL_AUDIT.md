# AIVAAHAN-MOBILE-MY-001: "MY RESPONSIBILITY" Ownership Model & Security Audit Report

## 📌 Executive Summary

This document presents a comprehensive **read-only architectural and security audit** of the **AiVaahan DWIP** platform's data models, APIs, and UI components against the **"MY RESPONSIBILITY" Ownership Model**. 

The fundamental rule for operational mobile software is that **the logged-in user must default to his/her own responsibilities**. For a Service Advisor, the mobile application must behave as a personal operational responsibility ledger rather than a workshop-wide ERP dashboard.

---

## 📑 Section 11 — 18-Point "MY RESPONSIBILITY" Data & API Audit Matrix

| # | Responsibility Item | Database Ownership Field | API Support | Authenticated User Filtering | UI Support | Scope (Workshop vs User) | Exact Gap & Resolution Requirement |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **MY JOB CARDS** | `job_cards.service_advisor` & `created_by` | `GET /api/job-cards` | Server-side RLS checks `LOWER(service_advisor) = LOWER(?)` for advisor role | `JobCards.tsx` & `AdvisorDashboard.tsx` | **User-Scoped (API)** | `service_advisor` is stored as an unnormalized string name rather than foreign key `advisor_employee_id`. |
| **2** | **MY VEHICLES** | `vos.vehicle_id`, `vos.current_owner`, `job_cards.vrn` | `GET /api/vehicles`, `GET /api/vos/all` | No user-level filtering on `/api/vehicles` | `VehiclePassport.tsx` | **Workshop-Wide** | No direct `vehicle_master.advisor_id`. "My Vehicles" must be derived via active `job_cards` or active `vos`. |
| **3** | **MY CUSTOMERS** | Linked via `job_cards.customer_name` / `customer_id` | `GET /api/customers` | No user-level filtering on `/api/customers` | `CustomerPassport.tsx` | **Workshop-Wide** | No customer-to-advisor FK. Must query customers with active/historical job cards assigned to `req.user`. |
| **4** | **MY PENDING VEHICLES** | `vos.current_state`, `job_cards.status = 'Waiting'` | `GET /api/vos/all`, `GET /api/job-cards?status=Waiting` | Partial RLS on job cards; unfiltered on VOS | `GateEntryManager.tsx` | **Workshop-Wide (Intake)** | Intake vehicles at `GATE_IN` are unassigned. Need explicit assignment action when converting `GATE_IN` $\rightarrow$ `WIP`. |
| **5** | **MY PENDING JOBS** | `job_cards.status` (`In Progress`, `Waiting Parts`) | `GET /api/job-cards` | Filtered by advisor in `workshop.routes.ts` | `AdvisorDashboard.tsx` | **User-Scoped** | Sub-status logs (`carry_forward_logs`, `rework_logs`) lack advisor-scoped API endpoints. |
| **6** | **MY ESTIMATES** | `job_cards.labor_price`, `job_cards.parts_price` | `GET /api/job-cards` | Inherits `GET /api/job-cards` RLS | `AdvisorDashboard.tsx` | **User-Scoped (via JC)** | Estimates are columns on `job_cards` rather than an independent entity table with approval lifecycle states. |
| **7** | **MY CUSTOMER APPROVALS** | `digital_approvals.job_id`, `digital_approvals.status` | `GET /api/digital-approvals` | **None**. Returns all approvals across branch | `AdvisorDashboard.tsx` | **Workshop-Wide** | Approval endpoint lacks JOIN with `job_cards` to filter by `job_cards.service_advisor = req.user.full_name`. |
| **8** | **MY FOLLOW-UPS** | `customer_feedback.followup_required`, `communication_logs` | `GET /api/customer-feedback` | **None**. Returns all branch feedback | `CustomerPortal.tsx` | **Workshop-Wide** | No advisor-scoped filtering on feedback or communication log APIs. |
| **9** | **MY BAY RESPONSIBILITIES** | `bays.bay_id`, `job_cards.bay_id`, `job_cards.service_advisor` | `GET /api/bays` | **None**. Returns all 12 workshop bays | `BayLayoutBoard.tsx` | **Workshop-Wide** | Bays are assigned to vehicles/JCs. "My Bays" must be dynamically resolved from active JCs assigned to advisor. |
| **10**| **MY READY-FOR-DELIVERY** | `job_cards.status = 'Ready'` / `live_status` | `GET /api/job-cards` | Filtered when fetching job cards | `AdvisorDashboard.tsx` | **User-Scoped** | No dedicated `/api/deliveries/ready` endpoint; UI filters job card array locally. |
| **11**| **MY DELIVERIES** | `job_cards.status = 'Delivered'`, `invoiced_at` | `GET /api/job-cards` | Filtered when fetching job cards | `AdvisorDashboard.tsx` | **User-Scoped** | `VehicleDelivery` interface exists in frontend, but backend lacks a `vehicle_deliveries` table. |
| **12**| **MY DUES / OUTSTANDING** | `job_cards.billing_status`, `invoices.job_card_id` | `GET /api/invoices` | **None**. Returns all branch invoices | `AdvisorDashboard.tsx` | **Workshop-Wide (Invoices)** | Billing `/api/invoices` lacks advisor RLS filter. Must join `invoices` with `job_cards` by `service_advisor`. |
| **13**| **MY SLA RISKS** | `job_cards.tat_status`, `l1_delay`, `vos.risk_level` | `GET /api/job-cards`, `GET /api/alert-logs` | Job cards filtered; alert logs unfiltered | `AdvisorDashboard.tsx` | **Mixed** | Alert logs `/api/alert-logs` do not filter by target `advisor_employee_id`. |
| **14**| **MY TODAY'S RECEIPTS** | `invoices.created_at`, `invoices.payment_status` | `GET /api/invoices` | **None**. | `AdvisorDashboard.tsx` | **Workshop-Wide** | Receipts aggregated at workshop level; no server-side filter for receipts on advisor's JCs today. |
| **15**| **MY TODAY'S DELIVERIES** | `job_cards.gate_out_time`, `invoiced_at` | `GET /api/job-cards` | Filtered when fetching job cards | `AdvisorDashboard.tsx` | **User-Scoped** | Relies on string timestamp matching (`date_completed` / `invoiced_at`). |
| **16**| **MY REVENUE** | `job_revenues`, `job_revenue_split_details` | `GET /api/analytics/revenue` | **None**. Returns workshop-wide revenue | `AdvisorDashboard.tsx` | **Workshop-Wide** | Analytics endpoint computes total workshop `SUM()`; lacks `WHERE advisor_id = req.user.user_id`. |
| **17**| **MY PRODUCTIVITY** | `technician_kpi_daily.employee_id` | `GET /api/analytics/productivity` | Query param `?employeeId=X` supported | `AdvisorDashboard.tsx` | **Client-Param Dependent** | Vulnerable to IDOR if client alters `?employeeId=X` param. Must default to `req.user.employee_id`. |
| **18**| **MY PERFORMANCE** | `technician_kpi_daily`, `customer_feedback` | `GET /api/analytics/kpis` | **None**. Workshop-wide default | `AdvisorDashboard.tsx` | **Workshop-Wide** | No advisor-scoped personal performance API endpoint. |

---

## 🔒 Section 12 — Security & Server-Side RLS Audit

### A. Current Security Model Strengths
1. **Authenticated JWT Identity**: `authenticateJwt` middleware ([src/api/middleware/auth.ts](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/src/api/middleware/auth.ts)) populates `req.user` (`user_id`, `username`, `role`, `full_name`).
2. **Job Card RLS**: `workshopRouter.get("/job-cards")` enforces server-side RLS for Service Advisors:
   ```sql
   SELECT * FROM job_cards 
   WHERE LOWER(service_advisor) = LOWER(?) 
      OR created_by = ?
   ```
3. **Job Card Detail 403 Guard**: `workshopRouter.get("/job-cards/:id")` executes `isAuthorizedForJobCard(jobCard, req.user)` and returns `403 Forbidden` if an advisor attempts to inspect another advisor's job card.

### B. Identified IDOR & Horizontal Authorization Vulnerabilities
1. **`/api/digital-approvals` IDOR**: Returns all customer digital approvals across the branch without checking if the linked job card belongs to `req.user`.
2. **`/api/invoices` & `/api/billing/*` IDOR**: Returns all branch invoices and outstanding balances without restricting data to the requesting advisor's job cards.
3. **`/api/analytics/*` IDOR**: Analytics endpoints accept client-supplied `?employeeId=X`. A Service Advisor can modify the query string parameter to inspect another employee's revenue and performance metrics.
4. **`/api/vos/all` IDOR**: VOS query endpoint returns all active workshop sessions without filtering by current custodian/owner (`vos.current_owner`).
5. **`/api/customer-feedback` IDOR**: Unfiltered endpoint returns customer ratings and complaints for all advisors.

### C. Security Rule Framework
- **"MY" MUST BE ENFORCED AT SERVER API LAYER**: Frontend filtering alone is insufficient.
- **Param Override Protection**: Server MUST override client-supplied `advisorId` or `employeeId` params with `req.user.user_id` / `req.user.employee_id` unless `req.user.role` is `service_manager`, `admin`, or `general_manager`.

---

## 📱 Section 13 — Service Advisor Mobile Home Architecture

### Screen Structure: Action & Responsibility First

```text
+-----------------------------------------------------------------------+
|  SHASHI PATIL (Service Advisor)                                       |
|  Devanand Automobiles — Sedam Road Branch (BR-SEDAM)                 |
|  Shift: 09:00 - 18:00  |  Active JCs: 7                              |
+-----------------------------------------------------------------------+
| 🚨 MY ATTENTION (Immediate Interventions)                             |
|  - 1 Overdue ETD Breach (KA-32-F-4589 - 25m overdue)                  |
|  - 2 Pending Customer Approvals (₹18,500 estimate pending)             |
|  - 1 New Gate-In Vehicle Assigned (KA-32-M-1102)                      |
+-----------------------------------------------------------------------+
| 🚗 MY VEHICLES TODAY (Active Ownership Ledger)                        |
|  [KA-32-F-4589] Tata Signa 2823.K | Ramesh Transport                  |
|   Stage: WORK_IN_PROGRESS | TAT: 2h 15m | Action: [Request Approval]   |
|  [KA-32-M-8890] Tata Prima 3530.K | Anand Logistics                   |
|   Stage: READY_FOR_DELIVERY | Dues: ₹14,200 | Action: [Collect & Gate Out]|
+-----------------------------------------------------------------------+
| 📊 MY WORK (Operational Responsibility Hub)                           |
|  [ My JCs: 7 ]  [ Pending Intake: 2 ]  [ Estimates: 4 ]                |
|  [ Approvals: 3 ]  [ Follow-ups: 4 ]   [ Ready Deliveries: 2 ]        |
+-----------------------------------------------------------------------+
| ⚠️ MY LIABILITY & EXCEPTIONS                                         |
|  - SLA Risk: 1 Vehicle nearing 4h limit                              |
|  - Dues Attributable to Me: ₹34,500 pending collection                 |
|  - Overdue Delivery Action: 1 Vehicle awaiting gate pass              |
+-----------------------------------------------------------------------+
| 🏆 MY PERFORMANCE (Personal Daily Scorecard)                           |
|  - Delivered Today: 4 Vehicles                                        |
|  - Revenue Earned Today: ₹1,12,400                                    |
|  - Avg Repair TAT: 3h 45m (Target: 4h 00m)                            |
|  - Customer CSAT: 4.8 / 5.0                                           |
+-----------------------------------------------------------------------+
```

---

## 🎯 Section 14 — Zero Generic Dashboard Rule Audit

Every proposed widget on the Service Advisor Mobile Home is validated against the 7 mandatory questions:

1. **MY ATTENTION** $\rightarrow$ Answers *WHAT NEEDS MY ACTION?* & *WHAT IS OVERDUE?*
2. **MY VEHICLES TODAY** $\rightarrow$ Answers *WHAT IS MINE?* & *WHAT IS PENDING FROM ME?*
3. **MY WORK** $\rightarrow$ Answers *WHAT AM I RESPONSIBLE FOR?* & *WHAT DID I COMPLETE?*
4. **MY LIABILITY & EXCEPTIONS** $\rightarrow$ Answers *WHAT AM I RESPONSIBLE FOR?* & *WHAT IS OVERDUE?*
5. **MY PERFORMANCE** $\rightarrow$ Answers *HOW AM I PERFORMING?*

### Excluded Generic Widgets (Moved to Secondary/Manager Views)
- **Workshop-Wide Revenue Pie Chart**: Moved to General Manager Cockpit.
- **Overall Workshop Bay Capacity Gauge**: Moved to Floor Supervisor View.
- **Warranty Claim Settlement Ledger**: Moved to Warranty Advisor View.

---

## 🔄 Section 15 — Role Expansion Principle (Document Only)

The **"MY RESPONSIBILITY" Ownership Model** is designed as a universal, role-agnostic architectural pattern:

```text
AUTHENTICATED USER
├── EMPLOYEE IDENTITY (user_id / employee_code)
├── ROLE (service_advisor / technician / qrt_driver / service_manager)
├── ORGANIZATION (company_id / dealer_id / branch_id)
└── ASSIGNMENTS (custodian_id / assigned_to / created_by)
    └── MY RESPONSIBILITY LEDGER
```

### Role Matrix Breakdown

1. **TECHNICIAN**:
   - `My Assigned Jobs` / `My Active Bay` / `My In-Progress Repairs` / `My Quality Pass Rate` / `My Rework Count` / `My Efficiency`

2. **QRT (Quick Response Team)**:
   - `My Active Breakdowns` / `My Dispatch Route` / `My Reach SLA (2h/4h)` / `My GPS Location Tasks` / `My Roadside Closures`

3. **SERVICE ADVISOR (Pilot Scope)**:
   - `My Customers` / `My Vehicles` / `My Active JCs` / `My Pending Action Items` / `My Deliveries` / `My Outstanding Dues` / `My Daily Performance`

4. **SERVICE MANAGER / GENERAL MANAGER**:
   - `My Workshop Team` / `Branch Capacity & Utilization` / `Exception Escalations` / `Overtime & Deviation Approvals` / `Dealer Target vs Actual Revenue`
