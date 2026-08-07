# DWIP Enterprise Business Blueprint

**Status:** DRAFT (Backlog Baseline)  
**Version:** 1.0  
**Governing Document:** EAR-001  

---

## 1. DWIP Enterprise Capability Matrix

Below is the complete inventory of the 20 required domains. Each item links directly to its governing EAR-001 architectural scope.

### 1. Business Modules
* **Inventory Control & Spares Management**
  * *Business Purpose:* Manage dealer spare parts inventory, parts requests, and stocking levels.
  * *EAR-001 Reference:* Section 3 (Lookup Tables), Section 5 (API Services)
  * *Current Status:* Partially implemented (Parts requests workflow exist, stock/bin management missing).
  * *Implemented:* 40% | *Missing:* 60%
  * *Priority:* High
  * *Dependencies:* Master Data (Parts Catalog), Role Master (Spares Manager)
  * *Target Sprint:* Sprint 4
* **Billing & Cashiering**
  * *Business Purpose:* Generate final dealer invoices, process customer payments, split service revenue.
  * *EAR-001 Reference:* Section 3 (Transaction Tables), Section 5 (Services)
  * *Current Status:* Implemented (Basic invoice generation and Revenue Split Engine active).
  * *Implemented:* 85% | *Missing:* 15%
  * *Priority:* Critical
  * *Dependencies:* Job Card lifecycle, Revenue Split Engine
  * *Target Sprint:* Sprint 5

### 2. Business Processes
* **Job Card Creation**
  * *Business Purpose:* Formal intake of vehicles requiring service.
  * *EAR-001 Reference:* Section 3 (Transaction Tables)
  * *Current Status:* Implemented (Active intake forms).
  * *Implemented:* 95% | *Missing:* 5%
  * *Priority:* Critical
  * *Dependencies:* Vehicle/Customer Master
  * *Target Sprint:* Sprint 1 (Refactoring under EAR-001)

### 3. Workflow Lifecycles
* **Gate Entry to Gate Out**
  * *Business Purpose:* Tracks vehicle operational lifecycle (Gate In -> Intake -> Diagnosis -> Estimate Approval -> WIP -> QC -> Invoicing -> Gate Out).
  * *EAR-001 Reference:* Section 4 (Workflow Engine, State Machine)
  * *Current Status:* Implemented but logic is duplicated between strategy files and hardcoded server logic.
  * *Implemented:* 75% | *Missing:* 25%
  * *Priority:* Critical
  * *Dependencies:* State Machine Engine
  * *Target Sprint:* Sprint 3

### 4. Master Data
* **Role Master & Employee Master Normalization**
  * *Business Purpose:* Single source of authority mapping users/employees to system privileges.
  * *EAR-001 Reference:* Section 3 (Master Tables)
  * *Current Status:* Fragmented (Employee designations are messy strings; users use static role values).
  * *Implemented:* 20% | *Missing:* 80%
  * *Priority:* Critical
  * *Dependencies:* Database Migration
  * *Target Sprint:* Sprint 1

### 5. Transaction Data
* **Service Invoicing**
  * *Business Purpose:* Records fiscal transaction details for audit, taxation, and dealer reconciliation.
  * *EAR-001 Reference:* Section 3 (Transaction Tables)
  * *Current Status:* Basic invoice table exists.
  * *Implemented:* 80% | *Missing:* 20%
  * *Priority:* Critical
  * *Dependencies:* Billing Module
  * *Target Sprint:* Sprint 5

### 6. User Roles
* **Canonical Role Enforcement**
  * *Business Purpose:* Map users strictly to the 16 approved dealership roles.
  * *EAR-001 Reference:* Section 4 (Role Engine)
  * *Current Status:* Partially implemented in database tables, but bypassed in route handlers via string-matching checks.
  * *Implemented:* 30% | *Missing:* 70%
  * *Priority:* Critical
  * *Dependencies:* Database Migration, Role Engine
  * *Target Sprint:* Sprint 1

### 7. Permission Matrix
* **Module-Action Matrix**
  * *Business Purpose:* Enforce strict access control mapping Role ID to Module ID to allowed actions.
  * *EAR-001 Reference:* Section 4 (Permission Engine)
  * *Current Status:* Under review (Config files exist but are not enforced natively at API routes).
  * *Implemented:* 15% | *Missing:* 85%
  * *Priority:* Critical
  * *Dependencies:* User Roles
  * *Target Sprint:* Sprint 1

### 8. Dashboards
* **Workshop Manager OCC (Operations Command Center)**
  * *Business Purpose:* Live visualization of operational efficiency, SLA statuses, and bay utilization.
  * *EAR-001 Reference:* Section 6 (Frontend Guidelines)
  * *Current Status:* Prototype/Basic layout functional.
  * *Implemented:* 60% | *Missing:* 40%
  * *Priority:* High
  * *Dependencies:* Workflow Engine, Real-time APIs
  * *Target Sprint:* Sprint 6

### 9. Reports
* **Daily KPI Snapshots**
  * *Business Purpose:* Daily automated tracking of TAT, revenue, rework counts.
  * *EAR-001 Reference:* Section 8 (Testing & Scripts)
  * *Current Status:* Partial scripts exist in `scratch/`.
  * *Implemented:* 50% | *Missing:* 50%
  * *Priority:* Medium
  * *Dependencies:* Audit/History database tables
  * *Target Sprint:* Sprint 7

### 10. Notifications
* **WebSocket Alerts & Escalations**
  * *Business Purpose:* Instantly notify technicians/supervisors of assignment changes and SLA breaches.
  * *EAR-001 Reference:* Section 4 (Notification Engine)
  * *Current Status:* Decentralized notification logic inside routes.
  * *Implemented:* 35% | *Missing:* 65%
  * *Priority:* High
  * *Dependencies:* Event Engine
  * *Target Sprint:* Sprint 2

### 11. Approval Flows
* **Warranty & FSB Approval Engine**
  * *Business Purpose:* Verify dealership goodwill, campaigns (FSB), or OEM warranty eligibility before billing.
  * *EAR-001 Reference:* Section 4 (Approval Engine)
  * *Current Status:* Strategy pattern stubs exist under `src/workflows/`.
  * *Implemented:* 20% | *Missing:* 80%
  * *Priority:* Critical
  * *Dependencies:* Workflow Engine
  * *Target Sprint:* Sprint 2

### 12. SLA Rules
* **Queue-Specific SLA Enforcer**
  * *Business Purpose:* Trigger alerts if a vehicle stays longer than limits (e.g., Gate-In intake must finish in 15 mins).
  * *EAR-001 Reference:* Section 4 (Workflow Engine)
  * *Current Status:* Rules defined in configuration object, but not actively enforced via cron alert engines.
  * *Implemented:* 50% | *Missing:* 50%
  * *Priority:* High
  * *Dependencies:* Notification Engine
  * *Target Sprint:* Sprint 3

### 13. Escalation Rules
* **Multi-Tier Alert Hierarchy**
  * *Business Purpose:* Escalates unresolved SLA breaches from Floor Supervisor to Workshop Manager, and eventually Dealer Principal.
  * *EAR-001 Reference:* Section 4 (Notification Engine)
  * *Current Status:* Missing.
  * *Implemented:* 0% | *Missing:* 100%
  * *Priority:* High
  * *Dependencies:* Notification Engine, User Roles
  * *Target Sprint:* Sprint 2

### 14. AI Features
* **Copilot & OCR Part Matching**
  * *Business Purpose:* Match parts using OCR scan and advise service advisors on historical failure profiles.
  * *EAR-001 Reference:* Section 4 (Workflow Engine)
  * *Current Status:* Experimental mock stubs active.
  * *Implemented:* 15% | *Missing:* 85%
  * *Priority:* Low
  * *Dependencies:* OCR Service
  * *Target Sprint:* Sprint 8

### 15. Mobile Features
* **Technician Mobile View**
  * *Business Purpose:* Allow technicians to log work start, trigger parts requests, and log QC submissions on standard handheld devices.
  * *EAR-001 Reference:* Section 2 (Final Repository Tree - frontend features)
  * *Current Status:* Partially functional via responsive frontend app pages.
  * *Implemented:* 65% | *Missing:* 35%
  * *Priority:* High
  * *Dependencies:* Mobile-responsive UI
  * *Target Sprint:* Sprint 6

### 16. Customer Portal Features
* **Live Vehicle Tracking**
  * *Business Purpose:* Inform customer of real-time progress, invoice review, and online approval for estimates.
  * *EAR-001 Reference:* Section 6 (Frontend Guidelines)
  * *Current Status:* basic template index file exists.
  * *Implemented:* 10% | *Missing:* 90%
  * *Priority:* Medium
  * *Dependencies:* Frontend router cleanup
  * *Target Sprint:* Sprint 7

### 17. Vendor Portal Features
* **Outside Job (OSJ) Work Orders**
  * *Business Purpose:* Manage outsourced service items (e.g., lathe work, localized body repair).
  * *EAR-001 Reference:* Section 2 (Integrations)
  * *Current Status:* Missing.
  * *Implemented:* 0% | *Missing:* 100%
  * *Priority:* Low
  * *Dependencies:* Vendor Master Data
  * *Target Sprint:* Sprint 8

### 18. Integrations
* **Oracle DMS Sync**
  * *Business Purpose:* Daily sync of closed job cards, spare parts requests, and financial posting to the central corporate Oracle ERP.
  * *EAR-001 Reference:* Section 2 (Integrations)
  * *Current Status:* File parsers exist.
  * *Implemented:* 45% | *Missing:* 55%
  * *Priority:* High
  * *Dependencies:* Database seeds, Job Card transaction tables
  * *Target Sprint:* Sprint 4

### 19. Audit Requirements
* **Action Logs & Decision Records**
  * *Business Purpose:* Logging overrides when managers bypass specific workflow rules or SLA policies.
  * *EAR-001 Reference:* Section 4 (Audit Engine)
  * *Current Status:* Basic database tables exist.
  * *Implemented:* 60% | *Missing:* 40%
  * *Priority:* Critical
  * *Dependencies:* Workflow Engine
  * *Target Sprint:* Sprint 3

### 20. Security Requirements
* **API Route Role-Guarding**
  * *Business Purpose:* Ensure no backend API can be hit by an unauthorized role (e.g., technicians must not call cashier billing routes).
  * *EAR-001 Reference:* Section 2 (Backend middleware), Section 4 (Permission Engine)
  * *Current Status:* Fragmented custom checks.
  * *Implemented:* 35% | *Missing:* 65%
  * *Priority:* Critical
  * *Dependencies:* Role & Permission Masters
  * *Target Sprint:* Sprint 1

---

## 2. Feature Coverage Matrix

* **Authentication & Identity:** 75%
* **Gate In / Out Operations:** 80%
* **Workshop Execution (WIP):** 60%
* **Billing, Payments & Invoicing:** 70%
* **Hierarchical Approvals:** 20%
* **Central Notifications & Alert Engine:** 25%
* **Inventory & Spares Procurement:** 20%
* **Reports, Metrics & Analytics:** 40%

---

## 3. Missing Functionality Register

1. **Role Master Integration:** Database references in API routes do not map to role IDs; hardcoded text variants persist.
2. **Centralized Permission Enforcement:** Middleware does not check the permissions table.
3. **centralized Escalation Rule Registry:** Alerts do not ascend user roles systematically during SLA breaches.
4. **Approval Matrix Engine:** Lack of multi-stage approval (Service Advisor -> Workshop Manager -> Dealer Principal) for Goodwill, FSB, or high-value estimate overrides.

---

## 4. Sprint Roadmap

* **Sprint 1: Role, Permission & User Master** (Consolidate canonical tables, replace ad-hoc role-checks with Permission Engine middleware).
* **Sprint 2: Notification & Escalation Engine** (Centralize notification module, define WebSocket escalations).
* **Sprint 3: Workflow State Machine & SLA Guards** (Merge config/strategies, enforce immutable state history and automated alert loops).
* **Sprint 4: Inventory, Spares & Oracle Integration** (Stock levels, bin mapping, basic sync routines).
* **Sprint 5: Billing, Cashiering & Final Auditing** (Invoice finalization, split revenue logic consolidation).
* **Sprint 6: Dashboards & Handheld Mobile Views** (Workshop OCC layout, technician mobile flow).
* **Sprint 7: Customer Portal & Live Vehicle Tracking** (Estimate approvals page, SMS links).
* **Sprint 8: Outside Jobs & Vendors Integration** (OSJ tracking, vendor catalogs).

---

## 5. GA Readiness Score

**Current Business GA Readiness Score: 41%**
* The core data transaction paths (Gate In -> Invoice) are functional but lack the enterprise-grade role checks, modular execution layers, database referential integrity, and automated escalation safeguards required for multi-dealership deployments. 

---
*End of Blueprint. Backlog established. Awaiting sign-off.*
