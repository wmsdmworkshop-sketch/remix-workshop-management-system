# AIVAAHAN_WORKFLOW_GAP_ANALYSIS.md — Architectural & Implementation Gap Analysis

## 📌 Executive Summary

This document presents an **honest architectural gap analysis** comparing the current codebase against the accepted **Devanand Gate-In $\rightarrow$ Gate-Out Role Responsibility Specification**. Every requirement is classified into one of 11 standardized categories.

---

## 🔍 Classification Matrix (Feature-by-Feature)

| Operational Requirement / Feature | Current Implementation Status | Evidence / File Path | Architectural Resolution Required |
| :--- | :--- | :--- | :--- |
| **1. Gate-In ANPR / OCR Capture** | **EXISTS & VERIFIED** | `ocr-processor.ts:23`, `gate-entry-engine.ts:18` | Core OCR functional; mobile photo capture active. |
| **2. Odometer & Vehicle Evidence** | **EXISTS & VERIFIED** | `job_cards.odometer_photo`, `tbl_evidence` | Database storage verified; evidence hash active. |
| **3. Service Advisor Job Card RLS** | **EXISTS & VERIFIED** | `workshop.routes.ts:44`, `workshop.routes.ts:98` | Server-side `WHERE service_advisor` & 403 guard active. |
| **4. 5-Minute Action Escalation Engine**| **MISSING** | No T+5m auto-escalation timer in `event-engine.ts` | **REQUIRES SCHEMA & API CHANGE**: Add handoff timer node & cron/scheduler worker. |
| **5. Normalized `advisor_employee_id` FK**| **GAP — IMPLEMENTATION REQUIRED**| `job_cards.service_advisor` (VARCHAR string) | **REQUIRES SCHEMA CHANGE**: Alter `job_cards` to store INT `advisor_employee_id`. |
| **6. ETA Extension Governance (>1h/>2h)**| **EXISTS BUT INCOMPLETE** | `job_cards.l1_delay`, `l2_delay`, `l3_delay` columns exist | **REQUIRES API & UI CHANGE**: Enforce Works Manager (>1h) and GM (>2h) approval guards. |
| **7. Customer Digital Approval Evidence**| **EXISTS & VERIFIED** | `digital_approvals`, `approval-engine.ts:18` | Digital approvals functional; need evidence reference link to `tbl_evidence`. |
| **8. GM Credit Approval Guard** | **EXISTS BUT CLIENT-ONLY**| Frontend checkbox; backend lacks GM role guard | **REQUIRES SECURITY CHANGE**: Enforce GM role check on credit approval endpoint. |
| **9. Rear Numberplate Gate-Out Photo** | **EXISTS BUT INCOMPLETE** | `vos.gate_out_time` exists; rear photo not mandatory | **REQUIRES API & UI CHANGE**: Make rear plate photo mandatory in `gateOut()` handler. |
| **10. Technician Single-Tap Timer** | **EXISTS & VERIFIED** | `repair-engine.ts:34`, `job_cards.started_at` | Timer functions; UI needs single-tap touch redesign. |
| **11. QC 25-Point Audit & Rework Loop**| **EXISTS & VERIFIED** | `quality-engine.ts:14`, `rework_logs` | QC engine and rework logging active in backend. |
| **12. Multi-Role "MY" API Scoping** | **EXISTS BUT NOT ROLE-SCOPED**| `/api/invoices`, `/api/digital-approvals`, `/api/vos` | **REQUIRES SECURITY & API CHANGE**: Add `req.user` server-side RLS across all routes. |
| **13. Real-Time WebSocket Event Push** | **EXISTS BUT NOT REAL-TIME** | WebSocketServer exists in `server.ts:13`; not wired to all events | **REQUIRES API CHANGE**: Connect `OperationalEventRepository.append()` to WS broadcast. |
| **14. Customer-Safe Status Partitioning**| **MISSING** | No distinction between internal and public events | **REQUIRES API CHANGE**: Add `event_visibility` flag (`INTERNAL`, `CUSTOMER`, `MANAGEMENT`). |
| **15. Overlapping Floating Feedback UI** | **EXISTS BUT CLIENT-DEFECT** | `walkthrough.md`, `page_dump.html:54` | **REQUIRES UI CHANGE**: Adjust CSS z-index and bottom safe-area offset for mobile nav. |

---

## 🏛️ Summary Classification Totals

- **EXISTS & VERIFIED**: 5 Core Modules (ANPR/OCR, Odometer Evidence, Advisor Job Card RLS, Customer Approvals, QC/Rework).
- **EXISTS BUT INCOMPLETE / CLIENT-ONLY**: 4 Modules (ETA Governance, Credit Guard, Rear Plate Photo, WebSocket Event Wiring).
- **MISSING / GAP — IMPLEMENTATION REQUIRED**: 6 Modules (5-Minute Escalation Engine, Normalized Advisor FK, Multi-Role "MY" RLS, Customer Event Partitioning, Mobile Safe-Area UI Fix, Role-First Mobile Home).
