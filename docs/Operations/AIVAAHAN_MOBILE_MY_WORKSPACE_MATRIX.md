# AIVAAHAN_MOBILE_MY_WORKSPACE_MATRIX.md — Mobile "MY" Workspace Specification Across 12 Key Operational Roles

## 📌 Executive Summary & Design Principles

The AiVaahan mobile experience is designed for operational speed, touch ergonomics, and single-role focus. Every role landing screen presents a **Role Responsibility Ledger** built from 6 standard layout sections:
1. **MY ATTENTION** (Immediate action items & T+5m breaches)
2. **MY CURRENT WORK** (Active custody & assigned vehicles/jobs)
3. **MY PENDING ACTIONS** (Handoffs awaiting my completion)
4. **MY SLA / LIABILITY** (SLA timers & risk warnings)
5. **MY COMPLETED TODAY** (Completed items)
6. **MY PERFORMANCE** (Personal daily KPI metrics)

---

## 📱 Role-by-Role Mobile Workspace Specification

### 1. SECURITY / GATE IN-CHARGE
- **MY ARRIVALS**: Live ANPR queue of approaching vehicles.
- **MY PENDING GATE-INS**: Vehicles waiting for manual intake completion.
- **MY OCR EXCEPTIONS**: Unread or low-confidence numberplate scans requiring manual verification.
- **MY ODOMETER CAPTURES**: Dashboard odometer photo upload tasks.
- **MY VEHICLE EVIDENCE**: Front/side vehicle condition photos.
- **MY PENDING GATE-OUTS**: Gate Pass QR scan queue.
- **MY REAR-PLATE CAPTURES**: Compulsory rear plate photo capture at gate exit.
- **MY GATE EXCEPTIONS**: Unauthorized gate attempt alerts.

### 2. RECEPTIONIST
- **MY TOKENS**: Issued digital arrival tokens.
- **MY WAITING VEHICLES**: Customers in waiting lounge.
- **MY PENDING INTAKES**: Unclassified arrival entries.
- **MY CLASSIFICATION QUEUE**: Service type assignment (`PM`, `RR`, `BODY`, `BREAKDOWN`).
- **MY UNVERIFIED DETAILS**: Missing customer/driver contact info.
- **MY HANDOFFS**: Intakes awaiting SA assignment.
- **MY SLA RISKS**: Customer waiting >10m without SA meeting.

### 3. SERVICE ADVISOR (Primary Pilot Scope)
- **MY CUSTOMERS**: Active customer contacts & fleet managers.
- **MY VEHICLES**: Vehicles currently assigned to me.
- **MY JOB CARDS**: Open & active job cards (`job_cards.service_advisor = req.user.full_name`).
- **MY NEW ASSIGNMENTS**: Newly assigned vehicles from Service Manager.
- **MY PENDING VALIDATIONS**: AMC / Warranty eligibility reviews.
- **MY COMPLAINTS**: Authenticated driver complaint notes.
- **MY ESTIMATES**: Draft & transmitted estimates.
- **MY CUSTOMER APPROVALS**: Estimates pending customer digital signature.
- **MY FOLLOW-UPS**: Due customer communications.
- **MY READY VEHICLES**: Vehicles passed QC ready for pre-invoice.
- **MY DELIVERIES**: Delivered vehicles today.
- **MY DUES / OUTSTANDING**: Uncollected billing balances on my JCs.
- **MY SLA RISKS**: Vehicles nearing ETD breach.
- **MY REVENUE & PERFORMANCE**: Daily labor/parts revenue earned & CSAT.

### 4. SERVICE MANAGER
- **MY UNASSIGNED VEHICLES**: Vehicles at Gate-In awaiting advisor assignment.
- **MY ADVISORS**: Workload balance matrix for my branch advisors.
- **MY ASSIGNMENTS**: Handoffs dispatched to advisors.
- **MY WORKLOAD BALANCING**: Active JC count per advisor.
- **MY PENDING APPROVALS**: Supplementary estimate approvals.
- **MY DELAYS**: Unacknowledged T+5m advisor handoff alerts.
- **MY ESCALATIONS**: Customer complaint escalations.
- **MY TEAM PERFORMANCE**: Daily branch advisor productivity & revenue.

### 5. WORKSHOP / WORKS MANAGER
- **MY WORKSHOP**: Live 360° floor overview.
- **MY FLOOR**: Active bay occupation & technician loading.
- **MY BAYS**: Bay status (Idle, Occupied, Blocked, Maintenance).
- **MY TECHNICIANS**: Live repair timer status per tech.
- **MY DELAYED VEHICLES**: Vehicles past ETD.
- **MY >1 HOUR EXTENSION APPROVALS**: Time extension requests requiring WM approval.
- **MY ESCALATIONS**: L2 SLA breaches & parts bottlenecks.
- **MY QC / REWORK EXCEPTIONS**: Vehicles failing QC >1 time.
- **MY WORKSHOP SLA**: Overall 4-hour SLA compliance %.

### 6. FLOOR IN-CHARGE / FLOOR SUPERVISOR
- **MY FLOOR**: Physical bay layout grid.
- **MY BAYS**: Bay allocation & lift status.
- **MY VEHICLES**: Vehicles currently on bay.
- **MY JOBS**: Repair jobs under execution.
- **MY TECHNICIANS**: Tech team assignment & assistance requests.
- **MY UNALLOCATED WORK**: Approved JCs waiting for bay/tech allocation.
- **MY DIAGNOSIS FOLLOW-UPS**: Pending initial diagnostic findings.
- **MY PARTS PENDING**: Requisitions waiting for parts room issue.
- **MY WORK COMPLETION NOTES**: Repair action sign-offs.

### 7. TECHNICIAN / TECHNICAL OPERATIONS
*Ultra-Simple Ergonomic Controls (Acknowledge, Start, Pause, Support, Finding, Complete)*
- **MY JOBS**: Assigned repair jobs.
- **MY VEHICLES**: Vehicle currently on my bay.
- **MY COMPLAINTS**: Specific complaint lines assigned to me.
- **MY CURRENT JOB**: Single active job card.
- **MY TIMER**: Big-button active repair timer (`[START WORK]`, `[PAUSE]`, `[COMPLETE]`).
- **MY PENDING WORK**: Upcoming jobs in my queue.
- **MY PARTS WAIT**: Issued vs pending spares for my job.
- **MY SUPPORT REQUESTS**: Tap-to-call Floor Supervisor for technical help.
- **MY COMPLETED JOBS**: Delivered jobs today.
- **MY PRODUCTIVITY**: Daily efficiency % & labor revenue generated.

### 8. PARTS PERSONNEL & PARTS MANAGER
- **MY PARTS REQUESTS**: Requisitions from workshop bays.
- **MY PENDING AVAILABILITY CHECKS**: Stock lookup requests.
- **MY PRICE REQUESTS**: Spare part pricing queries.
- **MY ISSUES**: Counter issue transactions.
- **MY PENDING JOBS**: Jobs waiting on backorder.
- **MY ETA COMMITMENTS**: Promised stock arrival dates.

### 9. WARRANTY PERSONNEL & WARRANTY MANAGER
- **MY WARRANTY CASES**: Open TML warranty claims.
- **MY ELIGIBILITY CHECKS**: Chassis warranty coverage reviews.
- **MY FSV CHECKS**: Free Service Voucher validity.
- **MY DOCUMENT GAPS**: Failed parts photos & diagnostic logs required by OEM.
- **MY APPROVALS**: Pre-claim submissions.
- **MY REJECTIONS**: Disputed claim rejections.

### 10. QC IN-CHARGE & ROAD TESTER
- **MY QC QUEUE**: Vehicles marked complete by technicians.
- **MY VEHICLES TO VERIFY**: Physical vehicles on QC bay.
- **MY ROAD TESTS**: Vehicles requiring high-speed road test audit.
- **MY QC FAILURES**: Rework cards returned to bay.
- **MY REWORK RETURNS**: Re-inspections following rework completion.
- **MY COMPLETIONS**: Passed QC certificates issued.

### 11. BILLING CLERK & CASHIER
- **MY PRE-INVOICE QUEUE**: Vehicles passed QC ready for billing.
- **MY BILLING QUEUE**: Open pre-invoices for GST invoice generation.
- **MY PAYMENT QUEUE**: Invoiced vehicles awaiting cashier payment.
- **MY CASH / DIGITAL / CHEQUE**: Daily collection breakdown.
- **MY CREDIT REQUESTS**: Fleet credit requests awaiting GM authorization.
- **MY PENDING CLEARANCES**: Cleared payments waiting for Gate Pass generation.
- **MY GATE-PASS ELIGIBLE VEHICLES**: Vehicles cleared for physical departure.

### 12. GENERAL MANAGER & DEALER PRINCIPAL COMMAND VIEWS
- **MY GM APPROVALS**: Credit requests & >2h time extension approvals.
- **MY CRITICAL ESCALATIONS**: SLA breaches >30m, unacknowledged T+5m handoffs.
- **MY BRANCH PERFORMANCE**: Live revenue, VOS throughput, FTR %, customer CSAT.
- **MY DEALERSHIP COMMAND VIEW**: Executive multi-branch exception monitoring.
