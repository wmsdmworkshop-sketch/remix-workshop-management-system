# AIVAAHAN_GATE_TO_GATE_MASTER_WORKFLOW.md — Gate-In to Gate-Out Master Lifecycle Specification

## 📌 Executive Summary & Operating Principles

This document specifies the authoritative **Gate-In → Gate-Out Operational Lifecycle** for the **AiVaahan DWIP Enterprise Platform** as deployed at **Devanand Automobiles (Sedam Road Workshop, Kalaburagi)**.

The mobile interface is **not a compressed desktop ERP**. It is a **Real-Time Role Responsibility Operating System**. For operational users, the system prioritizes action, ownership, liability, and SLA countdowns over passive data visualization.

---

## 🔄 28-Stage Devanand Master Operational Lifecycle

### STAGE 01: VEHICLE ARRIVAL & ANPR / MANUAL CAPTURE
- **Process**: Vehicle approaches gate. ANPR camera captures plate image or Security In-charge initiates manual mobile capture.
- **Evidence**: Numberplate photo (`job_cards.numberplate_photo`), entry timestamp (`vos.gate_in_time`).
- **Owner**: Security / Gate In-charge (`security_agent`).
- **Code Ref**: `server.ts:4120`, `VosLifecycleService.ts:45`, `gate-entry-engine.ts:18`.

### STAGE 02: NUMBER PLATE OCR & VEHICLE MATCHING
- **Process**: OCR processor parses VRN. System checks `vehicle_master` and `customer_passports`.
- **Evidence**: OCR confidence score (`tbl_evidence.ai_confidence`), raw OCR string (`ocr_processor.ts:23`).
- **Owner**: Automated System / Security In-charge.
- **Code Ref**: `src/engines/ocr-processor.ts:23`, `stg_vehicle_master`.

### STAGE 03: ODOMETER & INITIAL EVIDENCE CAPTURE
- **Process**: Security records odometer reading and captures photo of dashboard odometer.
- **Evidence**: Odometer photo (`job_cards.odometer_photo`), KM reading (`vos.odometer_at_gate_in`).
- **Owner**: Security / Gate In-charge.
- **Code Ref**: `src/workshop/gate-entry-engine.ts:32`, `vos.attributes`.

### STAGE 04: RECEPTION & TOKEN GENERATION
- **Process**: Vehicle transitions to reception area. Digital token issued for customer/driver waiting tracking.
- **Evidence**: Reception token ID, arrival timestamp.
- **Owner**: Receptionist / Gate In-charge.
- **Code Ref**: `src/workshop/reception-models.ts:12`.

### STAGE 05: JOB / COMPLAINT CLASSIFICATION
- **Process**: Initial classification into `PERIODIC_MAINTENANCE`, `RUNNING_REPAIR`, `BODY_SHOP`, or `BREAKDOWN`.
- **Evidence**: Category code (`job_cards.sr_type_id`, `vos.visit_type`).
- **Owner**: Receptionist / Service Advisor.
- **Code Ref**: `jobcard-models.ts:21`, `sr_types`.

### STAGE 06: SERVICE MANAGER / WORKSHOP MANAGER ASSIGNMENT
- **Process**: Service Manager reviews incoming queue and assigns vehicle/customer to Service Advisor based on workload.
- **Evidence**: Assigned advisor ID, assignment timestamp (`vos_owner_history`).
- **Owner**: Service Manager / Workshop Manager.
- **Code Ref**: `VosOwnershipEngine.ts:41`, `advisor-workload-engine.ts:14`.

### STAGE 07: SERVICE ADVISOR ACCEPTANCE
- **Process**: Service Advisor receives push alert/notification on mobile and accepts custody of vehicle.
- **Evidence**: Acceptance timestamp, advisor employee ID (`job_cards.service_advisor`).
- **Owner**: Service Advisor (`service_advisor`).
- **Code Ref**: `workshop.routes.ts:44`.

### STAGE 08: SERVICE HISTORY & ELIGIBILITY REVIEW
- **Process**: Advisor inspects 360° vehicle history, previous repairs, recurring issues, and active Tata Motors AMC/Warranty plan.
- **Evidence**: Vehicle passport log (`vehicle-passport/index.ts:15`), AMC contract status.
- **Owner**: Service Advisor.
- **Code Ref**: `vehicle-passport/index.ts:15`, `fleet_amc_contracts`.

### STAGE 09: COMPLAINT CAPTURE & AUTHENTICATION
- **Process**: Detailed recording of driver/fleet manager complaints. Complaint authenticated by driver signature/voice note.
- **Evidence**: Complaint text (`job_cards.job_description`), driver signature/media reference (`tbl_evidence`).
- **Owner**: Service Advisor.
- **Code Ref**: `jobcard-models.ts:20`, `tbl_evidence`.

### STAGE 10: CRM / DWIP JOB CARD CREATION
- **Process**: Formal Job Card generated (`JOB-2026-XXXXX`). VOS attached to job card.
- **Evidence**: `job_card_no`, `job_id`, `vos_number`.
- **Owner**: Service Advisor.
- **Code Ref**: `server.ts:3280`, `VosCorePlatform.vos.attachOemJobCard`.

### STAGE 11: FLOOR PLANNING & BAY AVAILABILITY
- **Process**: Floor Supervisor evaluates available bays (Prima HCV, Signa MCV, Ultra LCV, EV Bay) and bay equipment.
- **Evidence**: Assigned bay ID (`job_cards.bay_id`, `bays.status = 'Occupied'`).
- **Owner**: Floor Supervisor / Workshop Manager.
- **Code Ref**: `bay-capacity-engine.ts:22`, `bays`.

### STAGE 12: TECHNICIAN / TEAM ASSIGNMENT
- **Process**: Lead technician and co-technicians assigned based on skill certification and current load.
- **Evidence**: `job_technician_maps` entry (`employee_id`, `tech_role`, `assigned_at`).
- **Owner**: Floor Supervisor.
- **Code Ref**: `technician-assignment-engine.ts:19`, `job_technician_maps`.

### STAGE 13: TECHNICIAN DIAGNOSIS
- **Process**: Technician inspects vehicle on bay, runs diagnostic tools/fault code scanners, records preliminary finding.
- **Evidence**: Inspection notes (`inspection-engine.ts:12`), diagnostic log.
- **Owner**: Technician (`technician`).
- **Code Ref**: `inspection-engine.ts:12`.

### STAGE 14: PARTS REQUEST & AVAILABILITY CHECK
- **Process**: Technician/Floor In-charge creates parts requisition for required spares. Parts room checks stock.
- **Evidence**: Requisition ID, parts pricing (`parts_allocation-engine.ts:15`).
- **Owner**: Parts Personnel / Floor Supervisor.
- **Code Ref**: `parts_allocation-engine.ts:15`, `parts.routes.ts`.

### STAGE 15: WARRANTY & FSV ELIGIBILITY VALIDATION
- **Process**: Warranty Advisor validates whether failed parts qualify under Tata Motors warranty or goodwill.
- **Evidence**: Pre-approval claim score, warranty claim status.
- **Owner**: Warranty Advisor (`warranty_advisor`).
- **Code Ref**: `warranty-strategy.ts:28`, `warranty.routes.ts`.

### STAGE 16: ESTIMATE PREPARATION & COMMITTED ETA
- **Process**: Advisor compiles labor, parts, and warranty splits into pre-repair estimate with committed completion time.
- **Evidence**: `estimated_amount`, `etd`, `time_slot`.
- **Owner**: Service Advisor.
- **Code Ref**: `estimate-engine.ts:20`, `job_cards.etd`.

### STAGE 17: CUSTOMER APPROVAL & EVIDENCE CAPTURE
- **Process**: Estimate sent to customer via SMS/WhatsApp/Digital Portal. Customer approves digital estimate.
- **Evidence**: Approval record (`digital_approvals`), evidence reference (`tbl_evidence`), approval timestamp.
- **Owner**: Service Advisor / Customer.
- **Code Ref**: `approval-engine.ts:18`, `digital_approvals`.

### STAGE 18: WORKLIST START & TECHNICIAN TIMER
- **Process**: Customer approval received. Technician presses "START WORK" on mobile. Active repair timer starts.
- **Evidence**: `job_cards.started_at`, active timer node (`event-engine.ts:78`).
- **Owner**: Lead Technician.
- **Code Ref**: `repair-engine.ts:34`, `job_cards.started_at`.

### STAGE 19: REPAIR EXECUTION & ADDITIONAL FINDING LOOP
- **Process**: Technician performs repair. If additional hidden defects found, work pauses, revised estimate generated for re-approval.
- **Evidence**: Pause timestamp, revised estimate ID.
- **Owner**: Technician / Floor Supervisor / Service Advisor.
- **Code Ref**: `repair-engine.ts:55`, `carry_forward_logs`.

### STAGE 20: TIME EXTENSION GOVERNANCE (SLA)
- **Process**: If repair exceeds original ETD: <1h requires SA reason; >1h requires Works Manager approval; >2h requires GM approval.
- **Evidence**: Extension reason, approver ID, revised ETD.
- **Owner**: Works Manager / General Manager.
- **Code Ref**: `l1_delay`, `l2_delay`, `l3_delay`, `delay_notes`.

### STAGE 21: TECHNICIAN COMPLETION & FLOOR CONFIRMATION
- **Process**: Technician completes repair and marks job complete. Floor In-charge performs physical verification.
- **Evidence**: `job_cards.completed_at`, `actual_time_taken`, floor sign-off.
- **Owner**: Lead Technician & Floor Supervisor.
- **Code Ref**: `repair-engine.ts:80`, `job_cards.completed_at`.

### STAGE 22: QUALITY CONTROL (QC) & REWORK LOOP
- **Process**: QC In-charge performs 25-point quality audit. If failed, vehicle returned to bay with rework log; if passed, QC stamp issued.
- **Evidence**: Quality score (`quality-engine.ts:14`), rework log (`rework_logs`).
- **Owner**: QC In-charge (`qc_inspector`).
- **Code Ref**: `quality-engine.ts:14`, `rework_logs`.

### STAGE 23: ROAD TEST (WHERE APPLICABLE)
- **Process**: For engine/brake/transmission repairs, Road Tester takes vehicle for road test and logs performance data.
- **Evidence**: Road test log (`roadtest-engine.ts:10`), speed/brake verification.
- **Owner**: Road Tester / Senior Technician.
- **Code Ref**: `roadtest-engine.ts:10`.

### STAGE 24: SERVICE ADVISOR PRE-INVOICE CONFIRMATION
- **Process**: Advisor verifies job lines, labor splits, parts issued, and customer approval totals. Pre-invoice sent to customer.
- **Evidence**: Pre-invoice summary, advisor confirmation timestamp.
- **Owner**: Service Advisor.
- **Code Ref**: `delivery-engine.ts:15`.

### STAGE 25: FINAL INVOICE & BILLING VALIDATION
- **Process**: Billing clerk validates GST, labor splits, warranty credit offsets, and generates tax invoice.
- **Evidence**: Invoice number (`invoices.invoice_no`), total payable (`invoices.net_amount`).
- **Owner**: Billing Personnel (`billing_clerk`).
- **Code Ref**: `billing.routes.ts:22`, `invoices`.

### STAGE 26: CASHIER PAYMENT / CREDIT GOVERNANCE
- **Process**: Cashier collects Cash/UPI/Cheque OR obtains General Manager Credit Approval for fleet/credit accounts.
- **Evidence**: Payment UTR/reference (`invoices.payment_mode`), GM credit approval ID.
- **Owner**: Cashier (`cashier`) & General Manager (`general_manager`).
- **Code Ref**: `invoices.billing_status = 'Paid'`, `GM Credit Override`.

### STAGE 27: FINANCIAL CLEARANCE & GATE PASS GENERATION
- **Process**: Financial clearance confirmed. QR-coded Gate Pass generated.
- **Evidence**: `gate_pass_id`, clearance status.
- **Owner**: Cashier / Billing In-charge.
- **Code Ref**: `job_cards.billing_status = 'Paid'`, `gate_pass_id`.

### STAGE 28: SECURITY VALIDATION, REAR PLATE PHOTO & GATE-OUT
- **Process**: Security scans Gate Pass QR, takes compulsory Rear Registration Plate Photo, opens physical gate.
- **Evidence**: Rear plate photo, `vos.gate_out_time`, `job_cards.time_out`, handover sign-off.
- **Owner**: Security / Gate In-charge.
- **Code Ref**: `VosLifecycleService.ts:120`, `vos.gate_out_time`.
