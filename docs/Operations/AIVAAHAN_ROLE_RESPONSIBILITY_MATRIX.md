# AIVAAHAN_ROLE_RESPONSIBILITY_MATRIX.md — Authoritative Role & Stage Responsibility Matrix

## 📌 Executive Summary

This document specifies the **20-Role Responsibility Matrix** across the 28 stages of the Devanand Automobiles workshop lifecycle. Each stage defines the primary owner, secondary participants, view/act/modify/approve permissions, required inputs/outputs, evidence mandates, timestamps, SLAs, escalation paths, and customer/dealer visibility rules.

---

## 👥 20-Role Inventory & Canonical Definitions

1. **Security / Gate In-charge** (`security_agent`): Physical vehicle entry/exit, ANPR capture, odometer photo, rear plate evidence, gate pass validation.
2. **Receptionist** (`receptionist`): Token generation, customer reception, visit type classification, waiting lounge management.
3. **Service Advisor** (`service_advisor`): Customer complaint capture, 360° vehicle history review, estimate generation, customer approval acquisition, pre-invoice review, handover.
4. **Service Manager** (`service_manager`): Intake queue assignment to Service Advisors, workload balancing, advisor performance monitoring, customer escalation handling.
5. **Workshop Manager / Works Manager** (`works_manager`): Overall floor planning, technician loading, bay capacity governance, time extensions (>1h), QC exception reviews.
6. **Floor In-charge / Floor Supervisor** (`floor_supervisor`): Physical bay allocation, technician task assignment, diagnostic guidance, additional defect verification, repair sign-off.
7. **Technician** (`technician`): Primary mechanical repair execution, task timer start/complete, diagnostic inspection.
8. **Senior Technician** (`senior_technician`): Complex engine/electrical diagnostics, mentoring junior techs, road testing.
9. **Junior Technician** (`junior_technician`): Assisted repair execution, oil change, basic maintenance support.
10. **Electrician** (`electrician`): Auto-electrical diagnostic scanner operation, wiring harness repair, EV battery/sensor checks.
11. **Parts Personnel** (`parts_clerk`): Parts stock availability verification, requisition picking, parts issuing, cost logging.
12. **Parts Manager / In-charge** (`parts_manager`): Emergency stock procurement, backorder escalation, parts return approval.
13. **Warranty Personnel** (`warranty_clerk`): OEM warranty eligibility check, defective part Tagging, claim documentation upload.
14. **Warranty Manager / In-charge** (`warranty_manager`): High-value claim pre-approval, Goodwill claim authorization, OEM rejection dispute.
15. **QC In-charge** (`qc_inspector`): 25-point post-repair quality inspection, road test evaluation, QC pass/fail stamp.
16. **Road Test Responsibility** (`road_tester`): On-road vehicle performance audit, brake/suspension test logging.
17. **Billing Personnel** (`billing_clerk`): Pre-invoice verification, labor/parts tax split, final invoice generation, GST compliance.
18. **Cashier** (`cashier`): Payment collection (Cash/UPI/NEFT/Cheque), credit clearance verification, Gate Pass generation.
19. **General Manager** (`general_manager`): Major time extensions (>2h), customer credit approvals, SLA breach escalations, branch financial clearance.
20. **Dealer Principal** (`dealer_principal`): Executive real-time command dashboard monitoring, critical SLA & financial exception visibility.

---

## 📊 Comprehensive Stage Responsibility Matrix (Key Stages Summary)

### STAGE 01–03: INTAKE & SECURITY
- **Primary Owner**: Security / Gate In-charge (`security_agent`)
- **Secondary Participants**: Receptionist
- **Who Can View**: All roles
- **Who Can Act / Modify**: Security In-charge
- **Who Can Approve**: N/A
- **Who Cannot Approve**: Service Advisor, Technician
- **Input Required**: VRN, Odometer Reading, Driver Mobile
- **Output Created**: VOS Session (`GATE_IN`), Odometer Photo, Plate Image
- **Evidence Required**: Front Plate Photo, Odometer Photo
- **Start Timestamp**: `vos.gate_in_time`
- **SLA**: 5 minutes
- **Escalation**: T+5m $\rightarrow$ Service Manager
- **Handoff Event**: `VOS_GATE_IN_COMPLETED` $\rightarrow$ Receptionist / Service Manager

### STAGE 06–10: ADVISOR ASSIGNMENT & JOB CARD CREATION
- **Primary Owner**: Service Advisor (`service_advisor`)
- **Secondary Participants**: Service Manager, Customer
- **Who Can View**: Advisor, Managers, Customer
- **Who Can Act / Modify**: Assigned Service Advisor
- **Who Can Approve**: Customer (for Estimate)
- **Who Cannot Approve**: Technician, Security
- **Input Required**: Complaints, AMC Status, Vehicle History
- **Output Created**: Formal Job Card (`job_card_no`), Estimate
- **Evidence Required**: Driver Signature, Complaint Media
- **Start Timestamp**: `job_cards.created_at`
- **SLA**: 15 minutes
- **Escalation**: T+15m $\rightarrow$ Service Manager
- **Handoff Event**: `JOB_CARD_CREATED` $\rightarrow$ Floor Supervisor

### STAGE 11–21: FLOOR PLANNING, REPAIR EXECUTION & TIMER
- **Primary Owner**: Floor Supervisor & Lead Technician
- **Secondary Participants**: Parts Clerk, Electrician
- **Who Can View**: Advisor, Managers, Technician
- **Who Can Act / Modify**: Assigned Technician, Floor Supervisor
- **Who Can Approve**: Floor Supervisor (for Work Completion)
- **Who Cannot Approve**: Security, Receptionist
- **Input Required**: Job Card Lines, Approved Estimate, Issued Parts
- **Output Created**: Repair Completion Record, Active Work Duration
- **Evidence Required**: Replaced Parts Photos, Inspection Sheet
- **Start Timestamp**: `job_cards.started_at`
- **SLA**: Standard Repair Duration (SR Type default duration)
- **Escalation**: T+SLA $\rightarrow$ Works Manager
- **Handoff Event**: `WORK_COMPLETED` $\rightarrow$ QC In-charge

### STAGE 22: QUALITY CONTROL (QC) & REWORK
- **Primary Owner**: QC In-charge (`qc_inspector`)
- **Secondary Participants**: Floor Supervisor, Technician
- **Who Can View**: Managers, Advisor, QC
- **Who Can Act / Modify**: QC In-charge
- **Who Can Approve**: QC In-charge
- **Who Cannot Approve**: Technician (cannot self-QC)
- **Input Required**: Completed Vehicle on Bay/QC Line
- **Output Created**: QC Pass Certificate OR Rework Log (`rework_logs`)
- **Evidence Required**: 25-Point Checklist, QC Inspector Stamp
- **Start Timestamp**: QC Received Time
- **SLA**: 20 minutes
- **Escalation**: T+20m $\rightarrow$ Works Manager
- **Handoff Event**: `QC_PASSED` $\rightarrow$ Advisor / Billing

### STAGE 25–28: BILLING, PAYMENT & GATE-OUT
- **Primary Owner**: Billing Clerk, Cashier, Security In-charge
- **Secondary Participants**: General Manager (for Credit Approval)
- **Who Can View**: Advisor, Cashier, GM, Security
- **Who Can Act / Modify**: Billing Clerk, Cashier, Security
- **Who Can Approve**: GM (Credit), Cashier (Payment), Security (Gate Out)
- **Who Cannot Approve**: Service Advisor (cannot approve credit or release gate)
- **Input Required**: Verified Job Lines, Payment UTR / GM Credit Clearance
- **Output Created**: Tax Invoice, Gate Pass, Gate-Out Log (`vos.gate_out_time`)
- **Evidence Required**: Payment UTR Reference, Rear Plate Photo at Gate
- **Start Timestamp**: Invoice Generation Time
- **SLA**: 15 minutes
- **Escalation**: T+15m $\rightarrow$ General Manager
- **Handoff Event**: `GATE_OUT_COMPLETED` $\rightarrow$ Archived
