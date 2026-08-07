# AIVAAHAN_REALTIME_EVENT_MATRIX.md — Real-Time Event & Subscriber Routing Matrix

## 📌 Executive Summary & Architecture Audit

Everything in the AiVaahan mobile operating system operates in real-time. This document specifies the **Event → Subscriber Matrix**, defining which users, roles, timelines, and command views must be updated instantly upon every operational state transition.

---

## 📡 Real-Time Infrastructure Technical Audit

- **WebSocket Engine**: Instantiated in `server.ts:13` (`WebSocketServer`). Broadcasts live updates on port 3000 / HTTPS port.
- **Operational Event Engine**: Implemented in `src/core/event-engine.ts:49` (`OperationalEventRepository`). Appends immutable event nodes into `tbl_workflow_history`.
- **VOS Event Publisher**: Implemented in `src/core/vos/services/VosEventPublisher.ts:12` & `VosEventEngine.ts:10`. Emits domain events (`VOS_STATE_CHANGED`, `VOS_OWNERSHIP_TRANSFERRED`).
- **Core Event Bus**: Implemented in `src/core/event-bus.ts:5`. Facilitates in-memory pub-sub across engines.
- **Client Cache Invalidation**: Managed via `SyncOrchestrator` (`src/core/sync-orchestrator.ts`).
- **Firebase / Push Notifications**: Integrated via `firebase-mcp-server` & `@capacitor/push-notifications` for mobile background alerts.

---

## ⚡ Canonical Event → Subscriber Routing Matrix

| Event Type | Triggering Action / Source | Immediate Mobile Subscribers (Real-Time Push/WS) | Customer Visible? | Dealer Principal View? |
| :--- | :--- | :--- | :---: | :---: |
| **`VOS_GATE_IN`** | Security scans plate / submits gate intake | Security, Receptionist, Service Manager | YES ("Vehicle Received") | YES (Live Count +1) |
| **`SA_ASSIGNED`** | Service Manager assigns vehicle to Advisor | Assigned Service Advisor, Service Manager, Receptionist | NO | NO |
| **`SA_ACCEPTED`** | Advisor accepts custody of vehicle | Service Advisor, Service Manager, Floor Supervisor | NO | NO |
| **`JOB_CARD_CREATED`**| Advisor generates CRM/DWIP Job Card | Service Advisor, Floor Supervisor, Parts Clerk | YES ("Job Card Created")| YES |
| **`BAY_ALLOCATED`** | Floor Supervisor assigns vehicle to Bay | Floor Supervisor, Lead Technician, Service Advisor | NO | YES (Bay Utilization) |
| **`PARTS_REQUISITION`**| Technician requests replacement spares | Parts Personnel, Floor Supervisor | NO | NO |
| **`PARTS_ISSUED`** | Parts room issues spares for job | Lead Technician, Floor Supervisor, Service Advisor | NO | NO |
| **`WARRANTY_PRE_CHECK`**| Warranty clerk validates claim eligibility | Warranty Advisor, Service Advisor | NO | NO |
| **`ESTIMATE_SENT`** | Advisor transmits estimate to customer | Customer, Service Advisor | YES ("Estimate Ready")| NO |
| **`ESTIMATE_APPROVED`**| Customer signs/approves estimate | Service Advisor, Floor Supervisor, Lead Technician | YES ("Approval Confirmed")| NO |
| **`WORK_STARTED`** | Technician presses "Start Work" timer | Lead Technician, Floor Supervisor, Service Advisor | YES ("Work in Progress")| YES |
| **`REPAIR_PAUSED`** | Work paused for parts/approval/support | Lead Technician, Floor Supervisor, Service Advisor | NO | YES (Pause Reason) |
| **`ETA_EXTENDED`** | Manager approves time extension (>1h) | Service Advisor, Customer, Works Manager | YES ("Revised Delivery Time")| YES (Extension Flag) |
| **`WORK_COMPLETED`** | Technician marks repair complete | Floor Supervisor, QC In-charge, Service Advisor | YES ("Under Inspection") | YES |
| **`QC_PASSED`** | QC Inspector verifies 25-point audit | Service Advisor, Billing Clerk, Customer | YES ("Ready for Billing") | YES |
| **`QC_FAILED`** | QC Inspector flags defect & returns to bay | Lead Technician, Floor Supervisor, Works Manager | NO | YES (Rework Flag) |
| **`INVOICE_GENERATED`**| Billing clerk generates final GST invoice | Billing Clerk, Cashier, Service Advisor | YES ("Invoice Ready") | YES (Revenue +) |
| **`PAYMENT_CLEARED`** | Cashier logs payment / GM approves credit | Cashier, Security, Service Advisor | YES ("Payment Cleared")| YES |
| **`GATE_PASS_ISSUED`**| Gate Pass QR generated | Security In-charge, Customer | YES ("Gate Pass Ready") | NO |
| **`VOS_GATE_OUT`** | Security scans Gate Pass & takes rear photo| Security, Service Advisor, General Manager | YES ("Vehicle Delivered") | YES (Delivery Count +1)|

---

## 🔒 Customer vs Management Visibility Partitioning

1. **Customer-Safe Events**: `VEHICLE_RECEIVED`, `JOB_CARD_CREATED`, `ESTIMATE_SENT`, `ESTIMATE_APPROVED`, `WORK_IN_PROGRESS`, `REVISED_ETA`, `QC_UNDERWAY`, `READY_FOR_DELIVERY`, `INVOICE_READY`, `VEHICLE_DELIVERED`.
2. **Internal Operational Events**: `PARTS_REQUISITION`, `BAY_ALLOCATED`, `TECHNICIAN_PAUSED`, `REWORK_FLAGGED`, `WARRANTY_CHECK`, `CREDIT_REQUESTED`.
3. **Management Command Events**: `SLA_BREACH_WARNING`, `REPEATED_ETA_EXTENSION`, `QC_REWORK_BREACH`, `GM_CREDIT_OVERRIDE`, `UNACKNOWLEDGED_HANDOFF_5M`.
