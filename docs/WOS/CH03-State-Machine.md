---
Document ID: WOS-CH03
Title: Chapter 3 - Job Card Workflow State Machine
Version: 1.1.0
Status: APPROVED
Owner: DWIP Core Architecture Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-30
Updated Date: 2026-07-30
Dependencies: DWIP-WOS-001
Description: 12-state job card workflow lifecycle, transition rules, role access matrix, and state guard conditions.
---

# Chapter 3: Job Card Workflow State Machine

---

## 1. 12-State Workflow Lifecycle

```
[GATE_IN] ──> [INTAKE_PENDING] ──> [DIAGNOSTIC_WIP] ──> [ESTIMATE_PENDING]
                                                               │
[WIP_START] <── [PARTS_PENDING] <── [ESTIMATE_APPROVED] <──────┘
     │
     └──> [QC_PENDING] ──> [FINAL_REVIEW] ──> [INVOICED] ──> [GATE_OUT]
               │
               └── (QC_FAILED) ──> [WIP_START]
```

---

## 2. State Transition Matrix & Allowed Roles

| State | Allowed Transitions | Trigger Role | Guard Conditions |
| :--- | :--- | :--- | :--- |
| `GATE_IN` | `INTAKE_PENDING` | Security / Reception | Gate Pass created, VRN validated |
| `INTAKE_PENDING` | `DIAGNOSTIC_WIP` | Service Advisor | Customer complaints logged |
| `DIAGNOSTIC_WIP` | `ESTIMATE_PENDING` | Supervisor / Tech | Fault code / diagnosis logged |
| `ESTIMATE_PENDING`| `ESTIMATE_APPROVED`| Service Advisor | Customer / AI Override sign-off |
| `ESTIMATE_APPROVED`| `PARTS_PENDING`, `WIP_START` | Supervisor | Requisite parts checked |
| `PARTS_PENDING` | `WIP_START` | Parts Manager | Parts requisition fulfilled |
| `WIP_START` | `QC_PENDING` | Technician / Supervisor | Labor operations complete |
| `QC_PENDING` | `FINAL_REVIEW`, `QC_FAILED` | QC Inspector | Inspection checklist verified |
| `QC_FAILED` | `WIP_START` | QC Inspector | Rework log reason recorded |
| `FINAL_REVIEW` | `INVOICED` | Billing / Cashier | Invoice generated & paid |
| `INVOICED` | `GATE_OUT` | Security Agent | Gate Pass signed & verified |
