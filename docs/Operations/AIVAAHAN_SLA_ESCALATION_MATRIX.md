# AIVAAHAN_SLA_ESCALATION_MATRIX.md — 5-Minute Action & SLA Escalation Governance

## 📌 Executive Summary & Operating Principles

In the Devanand Automobiles workshop operating model, **internal actionable work must not remain unattended for more than 5 minutes without escalation**. 

This does **not** mean every mechanical repair must finish in 5 minutes. It means **an actionable handoff between roles must be acknowledged or acted upon within 5 minutes**. Legitimate external waiting (e.g. customer approval, parts backorder) is tracked separately and is never incorrectly classified as employee inactivity.

---

## ⏱️ State Classification Framework

| Workflow State | State Category | Timer Type | 5-Minute Handoff Rule Applies? |
| :--- | :--- | :--- | :---: |
| `GATE_IN` $\rightarrow$ `SA_ASSIGNED` | Internal Actionable | Handoff Timer | **YES (T+5m Escalation)** |
| `SA_ASSIGNED` $\rightarrow$ `SA_ACCEPTED` | Internal Actionable | Handoff Timer | **YES (T+5m Escalation)** |
| `SA_ACCEPTED` $\rightarrow$ `JOB_CARD_CREATED` | Internal Actionable | Process SLA | **YES (T+15m Process SLA)** |
| `JOB_CARD_CREATED` $\rightarrow$ `BAY_ALLOCATED` | Internal Actionable | Handoff Timer | **YES (T+5m Escalation)** |
| `BAY_ALLOCATED` $\rightarrow$ `WORK_STARTED` | Internal Actionable | Handoff Timer | **YES (T+5m Escalation)** |
| `ESTIMATE_SENT` $\rightarrow$ `CUSTOMER_APPROVED` | **Customer Wait** | External Wait Timer | NO (Tracked in Customer SLA) |
| `PARTS_REQUISITIONED` $\rightarrow$ `PARTS_ISSUED` | **Parts Wait** | Internal Wait Timer | **YES (T+15m Stock Check)** |
| `WORK_STARTED` $\rightarrow$ `WORK_COMPLETED` | Active Work | Repair SLA Timer | NO (Standard SR Type Duration) |
| `WORK_COMPLETED` $\rightarrow$ `QC_STARTED` | Internal Actionable | Handoff Timer | **YES (T+5m Escalation)** |
| `QC_PASSED` $\rightarrow$ `INVOICE_GENERATED` | Internal Actionable | Handoff Timer | **YES (T+5m Escalation)** |
| `INVOICE_GENERATED` $\rightarrow$ `PAYMENT_CLEARED` | Internal Actionable | Financial Clear Timer| **YES (T+15m Cashier SLA)** |

---

## 🔔 5-Minute Actionable Handoff Escalation Timeline

```text
T+0:00  -->  HANDOFF EVENT GENERATED
             Target Role receives immediate push notification & WebSocket alert.

T+2:30  -->  UNACKNOWLEDGED WARNING
             Amber visual pulse on mobile workspace card.

T+5:00  -->  LEVEL 1 ESCALATION (T+5M BREACH)
             System logs escalation event into `alert_logs`.
             Notification dispatched to Immediate Supervisor / Service Manager.

T+15:00 -->  LEVEL 2 ESCALATION
             Notification dispatched to Workshop Manager / Works Manager.

T+30:00 -->  LEVEL 3 CRITICAL ESCALATION
             Notification dispatched to General Manager & Dealer Principal Command View.
```

---

## 📊 Complete SLA Target & Escalation Matrix

| Lifecycle Transition | Target Role | Baseline SLA Target | L1 Escalation (T+5m / Threshold) | L2 Escalation | L3 Escalation (Critical) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Gate-In $\rightarrow$ SA Assignment** | Service Manager | 5 Minutes | Service Manager | Works Manager | General Manager |
| **SA Assignment $\rightarrow$ Acceptance** | Service Advisor | 5 Minutes | Service Manager | Works Manager | General Manager |
| **SA Acceptance $\rightarrow$ Job Card** | Service Advisor | 15 Minutes | Service Manager | Works Manager | General Manager |
| **Job Card $\rightarrow$ Bay Allocation** | Floor Supervisor | 5 Minutes | Works Manager | General Manager | Dealer Principal |
| **Bay Allocation $\rightarrow$ Repair Start** | Lead Technician | 5 Minutes | Floor Supervisor | Works Manager | General Manager |
| **Parts Requisition $\rightarrow$ Issue** | Parts Clerk | 15 Minutes | Parts Manager | Works Manager | General Manager |
| **Warranty Check $\rightarrow$ Pre-Check** | Warranty Advisor | 20 Minutes | Warranty Manager | Works Manager | General Manager |
| **Work Completed $\rightarrow$ QC Start** | QC Inspector | 5 Minutes | Works Manager | General Manager | Dealer Principal |
| **QC Execution $\rightarrow$ Pass/Fail** | QC Inspector | 20 Minutes | Works Manager | General Manager | Dealer Principal |
| **QC Pass $\rightarrow$ Pre-Invoice** | Service Advisor | 5 Minutes | Service Manager | Works Manager | General Manager |
| **Pre-Invoice $\rightarrow$ Tax Invoice** | Billing Clerk | 15 Minutes | Service Manager | General Manager | Dealer Principal |
| **Invoice $\rightarrow$ Payment / Credit** | Cashier | 15 Minutes | General Manager | Dealer Principal | Dealer Principal |
| **Payment $\rightarrow$ Rear Photo / Gate-Out** | Security In-charge| 5 Minutes | Service Manager | General Manager | Dealer Principal |

---

## ⏱️ Technician Time Engine & Timestamp Metrics

Every repair operation tracks the following 8 timestamp attributes without overwriting historical data:

1. `RECEIVED_AT`: Handoff timestamp when task arrived in role queue.
2. `ACKNOWLEDGED_AT`: Timestamp when employee tapped "Acknowledge" on mobile.
3. `STARTED_AT`: Timestamp when technician tapped "Start Work" timer.
4. `PAUSED_AT`: Timestamp when timer was paused (requires category reason).
5. `RESUMED_AT`: Timestamp when timer was resumed.
6. `WAIT_TIME_BY_REASON`: Accumulated wait time broken down by category (`PARTS_WAIT`, `CUSTOMER_WAIT`, `WARRANTY_WAIT`, `BAY_WAIT`, `SUPPORT_WAIT`).
7. `COMPLETED_AT`: Timestamp when repair/inspection was marked complete.
8. `ESCALATED_AT`: Timestamp when 5-minute or process SLA breach triggered escalation.
