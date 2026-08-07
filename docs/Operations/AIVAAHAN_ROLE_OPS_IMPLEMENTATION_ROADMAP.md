# AIVAAHAN_ROLE_OPS_IMPLEMENTATION_ROADMAP.md — Phased Implementation Roadmap

## 📌 Executive Summary

This document outlines the **Phased Implementation Roadmap** to transition the AiVaahan DWIP platform from its current architecture to the full **Gate-In $\rightarrow$ Gate-Out Real-Time Role Operating System**. 

The final implementation roadmap coordinates **THREE SIMULTANEOUS ARCHITECTURAL STREAMS** converging on the same authoritative workflow and event model:

- **STREAM A — ROLE OPERATIONS**: User identity, server-side RLS, "MY" workspaces, Gate-In $\rightarrow$ Gate-Out lifecycle, 5-minute escalation, approval governance.
- **STREAM B — INTELLIGENCE**: Contextual AI recommendations, workload balancing, predictive ETAs, warranty adjudication, accuracy logging (`tbl_workflow_history`).
- **STREAM C — INTEGRATION**: TMSA / Tata Motors CRM / Salesforce DMS / FleetEdge synchronization, DWIP Temporary Job Cards, `SyncOrchestrator` offline reconciliation.

---

## 🗺️ 11-Phase Multi-Stream Implementation Roadmap

### PHASE 0: IDENTITY, SCOPING & AUTHORIZATION CORRECTNESS
- **Objective**: Eliminate IDOR vulnerabilities and establish server-side `req.user` RLS across all API routes.
- **Key Tasks**:
  1. Add mandatory `req.user` filtering to `/api/invoices`, `/api/digital-approvals`, `/api/customer-feedback`, and `/api/vos/all`.
  2. Normalize `job_cards.service_advisor` to store `advisor_employee_id` (INT FK).
  3. Validate role-based endpoint permissions.

### PHASE 1: WORKFLOW OWNERSHIP & DOMAIN EVENT MODEL
- **Objective**: Wire all state transitions to the immutable event engine (`OperationalEventRepository`).
- **Key Tasks**:
  1. Emit `VOS_STATE_CHANGED` and `OWNERSHIP_TRANSFERRED` on every stage change.
  2. Connect event emission to WebSocketServer (`server.ts:13`) for instant client broadcast.
  3. Add `event_visibility` classification (`INTERNAL`, `CUSTOMER`, `MANAGEMENT`).

### PHASE 2: 5-MINUTE SLA & ACTION ESCALATION ENGINE
- **Objective**: Implement automatic escalation for unacknowledged internal handoffs exceeding 5 minutes.
- **Key Tasks**:
  1. Create background SLA worker/cron task in `src/core/event-engine.ts`.
  2. Log Level 1 (T+5m), Level 2 (T+15m), and Level 3 (T+30m) escalation events to `alert_logs`.
  3. Dispatch push notifications to Service Managers and Works Managers.

### PHASE 3: SERVICE ADVISOR ROLE-FIRST MOBILE WORKSPACE
- **Objective**: Build the primary Service Advisor mobile home (`MY ATTENTION`, `MY VEHICLES TODAY`, `MY WORK`, `MY PERFORMANCE`).
- **Key Tasks**:
  1. Implement "MY" workspace cards driven by server-side RLS endpoints.
  2. Add single-tap action buttons (`[Request Approval]`, `[Send Pre-Invoice]`).
  3. Enforce Zero Generic Dashboard rule.

### PHASE 4: SECURITY & RECEPTION MOBILE WORKSPACES
- **Objective**: Build touch-optimized mobile screens for Gate In-charge and Receptionist.
- **Key Tasks**:
  1. Security: ANPR scan queue, odometer photo upload, Gate Pass QR scanner, rear plate capture.
  2. Reception: Waiting lounge token management, visit classification.

### PHASE 5: FLOOR & TECHNICIAN OPERATIONAL WORKSPACES
- **Objective**: Deploy ultra-simple technician mobile interface (`ACKNOWLEDGE`, `START`, `PAUSE`, `SUPPORT`, `COMPLETE`).
- **Key Tasks**:
  1. Single-tap big-button task timer.
  2. Floor Supervisor bay layout grid & technician assignment matrix.
  3. Additional defect finding request loop.

### PHASE 6: PARTS & WARRANTY WORKSPACES
- **Objective**: Connect Parts room and Warranty clerk to real-time event pipeline.
- **Key Tasks**:
  1. Parts requisition picking queue & stock availability responses.
  2. Warranty pre-check validation & document gap alerts.

### PHASE 7: QC & REWORK ENGINE
- **Objective**: Enforce 25-point QC audit & automated rework return loop.
- **Key Tasks**:
  1. QC Inspector mobile audit sheet.
  2. Automated rework job creation & technician return notification (`rework_logs`).
  3. First-Time-Right (FTR %) metric tracking.

### PHASE 8: BILLING, CASHIER & CREDIT GOVERNANCE
- **Objective**: Enforce strict financial governance and GM-only credit approvals.
- **Key Tasks**:
  1. Pre-invoice vs estimate verification check.
  2. Cashier payment logging (Cash/UPI/Cheque/UTR).
  3. Enforce `general_manager` role requirement for credit approvals; block all other roles.

### PHASE 9: GATE-OUT & HANDOVER EVIDENCE
- **Objective**: Secure physical vehicle release and mandate rear plate photo capture.
- **Key Tasks**:
  1. QR Gate Pass validation.
  2. Mandatory rear registration plate photo capture at gate exit.
  3. Customer/Driver digital handover signature.

### PHASE 10: MANAGEMENT, GM & DEALER PRINCIPAL COMMAND VIEWS
- **Objective**: Deploy executive real-time command dashboards driven by operational events.
- **Key Tasks**:
  1. General Manager credit & >2h extension approval center.
  2. Dealer Principal live exception command view (Live Vehicles, SLA Breaches, Revenue).
