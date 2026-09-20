# WORKSHOP ERP V2 --- PROJECT MEMORY & AGENT OPERATING CONTRACT

**File name:** `PROJECT_MEMORY.md`\
**Purpose:** Persistent, repository-level memory for every coding agent
working on Workshop ERP v2, including VS Code agents, Antigravity,
Claude Code, or any future coding assistant.

------------------------------------------------------------------------

## 0. MANDATORY AGENT INSTRUCTION

Before analysing, designing, editing, deleting, migrating, refactoring,
or testing anything in this repository:

1.  Read `AGENTS.md` and `.agents/AGENTS.md` (the EAR-001 constitution
    for the running DWIP Enterprise system), then read this file
    completely.
2.  Read the relevant current project documents under `docs/`. Note that
    `docs/` currently holds only `CHANGELOG.md`, `releases/` and
    `templates/` — there is no business-rules, schema or permissions
    document set there yet. Do not assume one exists; say so if you need
    it.
3.  Inspect the actual code and the live production data before making
    assumptions.
4.  Follow the business rules and decisions recorded here, within the
    scope defined in §2.1.
5.  If a new decision conflicts with this file, `AGENTS.md`, or a live
    production constraint, stop and ask for clarification unless the
    owner has explicitly approved the change.
6.  After meaningful work, update this file or the relevant project
    decision document.
7.  Never silently overwrite an existing business rule, schema decision,
    permission rule, or workflow — in this file, in `AGENTS.md`, or in
    production.
8.  Do not create generic ERP behaviour where a specific Workshop ERP v2
    rule is already defined.

**Owner:** Sayeed Jaffer\
**Product:** Workshop ERP v2\
**Initial rollout:** Sedam Road workshop pilot, followed by the
remaining workshops.

This file is a living project memory. Agents must preserve historical
decisions and append or revise them deliberately, with a clear date and
reason.

------------------------------------------------------------------------

# 1. PRODUCT DIRECTION

Workshop ERP v2 is a clean, ground-up rebuild of the earlier DWIP
Enterprise system.

The previous DWIP Enterprise implementation became difficult to maintain
and wire together. Workshop ERP v2 must therefore prioritise:

-   Clear domain boundaries.
-   Explicit business rules.
-   Role-specific workflows.
-   Strong auditability.
-   Configurable workshop-level SLAs and checklists.
-   A job card as the central operational entity.
-   Independent parallel tracks where required.
-   Minimal, precise interfaces for floor staff.
-   No generic assumptions when the owner has defined a specific rule.

The system is intended to operate alongside Tata Motors CRM/DMS and
related OEM systems. It must not assume that the new ERP replaces every
OEM process.

------------------------------------------------------------------------

# 2. DEVELOPMENT PRINCIPLES

## 2.1 Scope and source-of-truth hierarchy

**This file is a specification for PROPOSED Workshop ERP v2. It does not
govern the current production system.** The repository it lives in runs
DWIP Enterprise in production (Cloud Run service `dwip-enterprise`, 671
job cards, live traffic). `AGENTS.md` and `.agents/AGENTS.md` are that
system's binding constitution.

This file must never silently override `AGENTS.md` or a live production
constraint. Where the two disagree, the existing system wins and the
conflict is recorded and raised — never resolved by assumption.

### For the CURRENT production system (DWIP Enterprise)

When information conflicts, use this order:

1.  Explicit owner decision in the current conversation or an approved
    project decision record.
2.  `AGENTS.md` and `.agents/AGENTS.md` (EAR-001).
3.  Live production constraints: the deployed revision, the real schema,
    and the real data in it.
4.  Current code and tests — they describe what actually runs.
5.  This file, and only where it does not conflict with 1–4.

### For the PROPOSED Workshop ERP v2 design

Where no production behaviour is involved:

1.  Explicit owner decision.
2.  This file.
3.  Approved design documents.
4.  Agent inference or generic ERP conventions.

### In both cases

If a conflict cannot be resolved confidently, do not guess. Record the
conflict and ask the owner. Never let a proposed rule displace a rule
that is already live.

## 2.2 No silent assumptions

Agents must not assume:

-   A role has permissions merely because it is operationally
    convenient.
-   A workflow is sequential when the business rules define independent
    gates.
-   An OEM job card exists at gate-in.
-   A job card is closed when the vehicle exits.
-   A warranty flag is static.
-   One job card can contain only one warranty claim.
-   Every role needs desktop access.
-   Every approval can be represented by one generic approval table.
-   Generic fallback permissions are acceptable.
-   Data may be fabricated to make a screen look complete.

## 2.3 Safe implementation

Before modifying code:

-   Inspect relevant routes, components, services, schema, migrations,
    tests, and configuration.
-   Identify all consumers of the affected data or function.
-   Preserve existing behaviour unless the change explicitly modifies
    it.
-   Add or update tests for business-critical rules.
-   Do not print secrets, API keys, tokens, or private credentials.
-   Do not modify production data or run destructive migrations without
    explicit approval.
-   Do not remove files or reset branches to solve a problem without
    approval.
-   Keep changes small, reviewable, and traceable.

------------------------------------------------------------------------

# 3. CURRENT BUSINESS MODEL

## 3.1 Workshop rollout

-   Pilot workshop: Sedam Road.
-   Later rollout: remaining workshops.
-   Rules such as SLA thresholds, escalation aging, and safety checklist
    items must be configurable per workshop through the setup wizard
    unless explicitly defined as global.

## 3.2 Core operational principle

The job card is the central point of entry for most operational roles.

However, not every role is job-card-first:

-   Workshop Manager: distinct operational dashboard.
-   GM Service: full workshop vehicle board and job-card drill-down.
-   Tools In-Charge: tool inventory and safety home.
-   CSC/CRO: service-request and KPI-oriented workflow.
-   Breakdown In-Charge: cross-workshop breakdown operations.

## 3.3 Visibility principle

Default rule:

> Every role sees the job card one step ahead of reaching that role, not
> the whole floor.

Confirmed exception:

-   Spare Parts sees the job card from SA assignment onward because
    parts availability influences the OEM job-card raise decision.

Visibility must be enforced in backend authorization, not only hidden in
the frontend.

------------------------------------------------------------------------

# 4. JOB CARD AND VEHICLE STATUS MODEL

> **This section contains two different things.** §4.1 is the CURRENT,
> MEASURED state of production. §4.2 and §4.3 are the PROPOSED Workshop
> ERP v2 model. They do not match, and that is expected: v2 is a rebuild.
> Do not implement §4.2 against the live database — it would orphan every
> existing job card.

## 4.1 Current production statuses (measured 2026-09-18)

Two independent status axes exist today, they disagree with each other,
and neither matches §4.2. Both are plain text, not enums.

`job_card_master.live_status` — all 671 rows:

| live_status | rows |
| --- | --- |
| `GATE_OUT` | 442 |
| `Waiting` | 116 |
| `Unassigned` | 85 |
| `Assigned` | 10 |
| `FLOOR_ALLOCATED` | 9 |
| `GATE_ENTRY_DONE` | 7 |
| `BILLING_IN_PROGRESS` | 1 |
| `🔵 Waiting Allocation` | 1 |

`job_card_master.job_status` — all 671 rows:

| job_status | rows |
| --- | --- |
| `Delivered` | 570 |
| `In Progress` | 44 |
| `Assigned` | 28 |
| `Unassigned` | 25 |
| `Ready` | 4 |

Observed problems to carry into v2, not to reproduce:

-   **None of §4.2's proposed statuses appears in production.** The naming
    schemes are unrelated (`GATE_OUT` vs `gated-in`).
-   **One live value contains an emoji** (`🔵 Waiting Allocation`), which
    no proposed enum would accept.
-   **`Assigned` means different things on the two axes**, and neither is
    documented: 10 rows are `live_status = Assigned` with **no technician
    recorded**, and 28 are `job_status = Assigned`.
-   **A job closes at physical vehicle exit today**, not at invoice
    generation as §4.2 proposes: 442 rows sit at `GATE_OUT` and 570 are
    `Delivered`. Changing that is a production behaviour change, not a
    design decision.

## 4.2 PROPOSED Workshop ERP v2 job-card status sequence
*(not implemented — target state)*

Status begins at gate-in. The outside queue has no job-card status.

The proposed sequence is:

1.  `gated-in`
2.  `reception`
3.  `with-workshop-manager`
4.  `with-sa`
    -   Estimate building
    -   OEM job-card raise decision
    -   Floor-allocation decision
5.  `estimate-pending-customer`
    -   Sub-status under `with-sa`
6.  `on-floor`
7.  `waiting-for-parts`
    -   Sub-status under `on-floor`
8.  `paused-vendor`
9.  `qc`
10. `pre-invoice`
11. `waiting-for-payment`
12. `payment-received-invoice-generated`
13. `closed`

Additional proposed rules:

-   Vendor pause returns to `on-floor`.
-   Tool-return and similar checks occur before QC.
-   QC has one status; a QC failure routes back to `on-floor`.
-   Parts requisition and warranty/AMC/FMS work are parallel tracks, not
    separate primary job-card statuses.
-   **Proposed change, and it contradicts production:** a job card would
    close at invoice generation, not at physical vehicle exit. §4.1
    records what actually happens today.

## 4.3 PROPOSED Workshop ERP v2 vehicle status
*(not implemented — no such column exists)*

Vehicle status would be tracked separately and continue after job-card
closure:

1.  `awaiting-gate-out`
2.  `gate-pass-issued`
3.  `vehicle-exited`

No `vehicle_status` column exists in production. The nearest equivalents
are `live_status = 'GATE_OUT'` and the `gate_out_time` timestamp.

------------------------------------------------------------------------

# 5. ROLE AND WORKFLOW RULES

## 5.1 Security

-   Captures VRN and odometer using phone camera.
-   Primary method: ANPR.
-   Fallback 1: manual photo capture.
-   Fallback 2: manual VRN/odometer entry.
-   Token scanner captures arrival time.
-   Gate-in queue is strictly FIFO by arrival time.
-   Customer pressure must not bypass FIFO.
-   Fuel gauge percentage and photo are captured.
-   Breakdown flag is captured where applicable.
-   OEM Workshop Automation gate-in is recorded separately.
-   ERP gate-in is not blocked by missing OEM Workshop Automation
    gate-in.
-   OEM CRM job-card raising is blocked until OEM Workshop Automation
    gate-in is confirmed.
-   Security creates an internal/temporary job-card ID at gate-in.
-   Internal ID maps 1:1 to the OEM job card once raised.
-   Security has create-only access to gate-in data and no edit rights.

## 5.2 Reception

-   Verifies VRN and odometer from gate-in.
-   Uses the actual plate photo and odometer photo for verification.
-   Captures preliminary complaints.
-   Segments job type:
    -   Scheduled service
    -   Warranty failure
    -   Major work
    -   Diagnosis
-   Suggests the SA using equal distribution of current job count.
-   Reception performs the suggestion because the driver needs an
    immediate point of contact.
-   Workshop Manager has a hard 5-minute SLA to confirm or override.
-   Missed SLA escalates to GM.
-   Reception may correct gate-in data only while the job card is at
    reception.
-   After handoff to Workshop Manager, reception edit access closes.

## 5.3 Workshop Manager

Checks and locks:

-   Warranty validity.
-   FSB validity.
-   Fleet/key-customer status.
-   Old outstanding balance.
-   AMC/FMS contract status.
-   FSB eligibility at SA-assignment time.

Rules:

-   Workshop Manager confirms or reassigns the suggested SA.
-   Locked checks are not self-editable after completion without a
    triggering reason.
-   Warranty Team and Billing may flag and correct errors in these
    locked checks.
-   Workshop Manager is notified and acknowledges corrections.
-   No hard approval gate is required for those corrections.
-   QC does not have this correction right.
-   Outstanding balance does not block work in progress.
-   Outstanding balance blocks gate-out unless GM overrides.
-   Fleet/key-customer status affects queue priority and visual
    flagging.

## 5.4 Service Adviser

-   **Ownership (owner-confirmed 2026-09-20): the job card's owner is always
    the Service Adviser.** "Job card owner" resolves to this one field and
    nothing else. `created_by` is a creation stamp and is never ownership.
-   Store the owner as an employee identifier, with the display name derived
    from it. DWIP stores the SA as a free-text name, which is what produced its
    19-row `'ranjeet '` trailing-space defect and a case-sensitive name compare
    in `EmployeePerformanceHub.tsx:25`; an owner that cannot be joined cannot be
    reported on.
-   Assignment suggestion uses equal distribution of current job count.
-   SA reviews already-locked coverage information.
-   SA logs complaints and prepares estimates from the parts price list.
-   SA shares estimates with the customer.
-   Customer approval, OEM CRM job-card raise, and floor allocation are
    independent gates.
-   Customer approval is customer-facing and may occur through WhatsApp,
    call, in-person communication, or driver.
-   OEM CRM job card is deliberately deferred until:
    -   Parts availability is confirmed.
    -   TAT feasibility is confirmed.
    -   OEM Workshop Automation gate-in is confirmed.
-   Repeat complaints follow the same deferred approach.
-   Floor allocation is the SA's independent decision and has its own
    SLA.
-   SA may reject an assignment with a reason.
-   Estimate changes after customer approval require fresh approval
    except within ±10% of the original estimate value.
-   SA executes conversion from warranty/AMC/FMS to paid when requested
    by Warranty Team.

## 5.5 Floor In-Charge

-   If no Floor In-Charge is present, Workshop Manager performs the
    role.
-   Main purpose: bay and technician utilisation plus technician
    productivity.
-   Technician and bay are assigned together.
-   A technician without a bay produces an `out-of-bay` flag.
-   If no technician is free, system suggests the technician whose
    current job is estimated to finish soonest.
-   Higher-priority work may interrupt lower-priority work.
-   Lead and usual assistant pair should be shown where relevant.
-   Fixed lead-assistant pairs are preferred but can be broken for
    priority cases.
-   Junior technicians may work individually on small/running-repair
    jobs.
-   Floor In-Charge and Workshop Manager can use the
    technician-assignment-lock override with a free-text reason.
-   Assignment calls are exclusive to Floor In-Charge; SA and Workshop
    Manager cannot directly edit assignments.

## 5.6 Technician

-   Receives work from Floor In-Charge/SA.
-   Can request parts using a name/description.
-   Resumes and completes work after parts are issued.
-   Classified by:
    -   Senior/junior/helper
    -   Mechanical/electrical/wheel-alignment trade
-   Full access only to actively assigned job cards.
-   Can view overall floor queue read-only and total vehicles in the
    workshop.
-   Cannot see technician-to-job assignment mapping.
-   Lead technician may be actively started on multiple job cards, with
    different assistant pairings.
-   Assistant technician may be on only one active started job for a
    given vehicle.
-   Assistant lock releases when that job enters a paused state.

## 5.7 Technician productivity

Labour revenue is divided among assigned technicians.

Single vertical:

-   Solo technician: 100%.
-   One lead + one assistant: 60/40.
-   One lead + two assistants: 40/30/30.

Multi-vertical:

-   Mechanical, electrical, and outsourced/vendor verticals are
    considered.
-   Vendor cost is deducted from total before vertical split when a
    vendor vertical exists.
-   Remaining amount is split 50/50 across in-house verticals where
    applicable.
-   Each vertical then applies the internal technician ratio.

Threshold:

-   If total in-house headcount exceeds 4, tapered ratios stop.
-   Each vertical divides its share equally among its own headcount.

Overtime:

-   Approved OT amount is deducted from the job's labour revenue before
    productivity splitting.
-   OT pay is never counted as productivity.
-   Deduction applies to all technicians on that job card because the
    job was collectively unfinished.
-   Mid-job technician changes have no fixed formula; Floor In-Charge
    decides the actual split.

## 5.8 Spare Parts

At Sedam Road:

-   Oil room in-charge.
-   Picker.
-   Two operators.
-   One manager.

Rules:

-   Spare Parts sees the job card from SA assignment onward.
-   Checks availability immediately.
-   Updates/uploads price.
-   If cost exceeds the original estimate, fresh customer approval is
    required before issue.
-   ±10% estimate tolerance applies to spare-part changes as well.
-   Unavailable part immediately notifies Spare Parts Manager and
    Workshop Manager.
-   GM escalation occurs after configurable aging threshold measured
    from part-request time.
-   Return/unsuitable part supports re-issue or restock.
-   Warranty parts require both:
    -   Issuance confirmation.
    -   Shipping-to-vehicle-job-card confirmation.
-   Shipping confirmation is required before ready-for-billing.
-   Low-stock alerts are required.
-   Broader inventory/procurement management is deferred to later
    desktop design.

## 5.9 QC

-   Reviews after job completion.
-   May participate during complex or ambiguous diagnosis.
-   If no dedicated QC exists, Floor In-Charge performs QC.
-   Verifies complaints are resolved.
-   May road-test.
-   Gets driver/owner/representative acknowledgement.
-   Marks ready for billing.
-   QC is mandatory before CRM job-card closure.
-   QC failure routes back to on-floor.
-   QC, technician, and Floor In-Charge see failure/rework.
-   Workshop Manager additionally sees it for fleet/key-account
    vehicles.
-   QC write access is limited to:
    -   Own pass/fail/rework verdict.
    -   Inspection notes.
    -   Non-blocking advisory note.
-   Advisory note is communicated to the customer by SA, not QC.

## 5.10 Ready-for-billing

Every job card requires two independent confirmations:

1.  Spare Parts:
    -   Parts issued.
    -   Warranty parts shipped where applicable.
2.  Warranty Team:
    -   Indent raised.
    -   Evidence captured.
    -   Parts and labour approved where applicable.

This check applies to every job card because classification may change
later and mixed paid/warranty jobs are possible.

## 5.11 Warranty Team

-   Queue visibility begins when SA classifies a job as Warranty,
    AMC/FMS, or Free Service.
-   This does not remove the universal ready-for-billing check.
-   Reviews evidence and confirms indent against issued parts.
-   Verifies the CRM complaint code.
-   Approves warranty parts and labour.
-   Can change paid to warranty/AMC/FMS.
-   Cannot directly convert free-to-customer classification into paid.
-   May initiate the request; SA executes the conversion.
-   Warranty evidence media is retained until the claim is settled.

FSB:

-   Eligibility depends on model, date of sale, LOB, mileage, date, and
    the applicable circular.
-   OCR extraction from circulars is planned.
-   If outside the eligible window:
    -   FSB claim may be rejected.
    -   Workshop may remain unreimbursed.
    -   Customer warranty may be at risk.
-   Eligibility check happens at SA assignment time.
-   Customer must be informed and approval captured before work
    proceeds.
-   Odometer/photo manipulation is explicitly out of scope.

## 5.12 Billing

-   Cross-checks job codes, customer name, and GSTIN.
-   Supports partial payments.
-   Schedule-only billing must explicitly record work completed and work
    pending.
-   Discounts are handled in CRM.
-   Spares discount up to 3%: spares approval.
-   Labour discount up to 3%: Workshop Manager approval.
-   Either category above 3%: GM approval.
-   Billing can edit final line items only with SA sign-off before
    applying the change.
-   Payment proof is mandatory for collection.
-   Final invoice and payment proof are uploaded.

## 5.13 Gate-Out

Gate pass is generated through Tata Motors CRM after:

-   Billing/payment requirements.
-   Required GM approval.
-   Credit-mode approval or outstanding-balance override.

If GM is unavailable:

-   Security may use phone confirmation plus proof such as call
    recording, WhatsApp, or voice note.
-   This only unblocks gate-out.
-   Record remains pending GM until formal approval.
-   Security agency is accountable for preserving valid proof.

## 5.14 GM Service

-   GM home is not a set of generic approval queues.
-   Home is a board of every vehicle currently in the workshop.
-   Shows status, assignee, and SLA-breach flag.
-   Selecting a vehicle opens the job-card timeline.
-   Pending approval is actionable inside the relevant job card.
-   GM has blanket edit access across job cards and fields.
-   Exceptions:
    -   Cannot directly edit QC verdict.
    -   Cannot directly edit customer-communication content intended for
        SA, such as QC delivery advisory notes.
-   GM may direct SA to make those changes.

## 5.15 Overtime

-   Rate: 1.5x normal pay.
-   Daily cap: 5 hours regardless of number of jobs.
-   Not automatic from punch times.
-   Request must be raised at least 30 minutes before shift closing.
-   Request is raised through the specific job card.
-   Raised by Floor In-Charge or Workshop Manager, never technician.
-   Two-stage approval:
    1.  Workshop Manager.
    2.  GM.
-   Post-hoc revenue comparison is an audit, not a blocking gate.

## 5.16 Vendors

Two categories:

1.  Machine-shop vendors:
    -   Drum skimming.
    -   Brake lining.
    -   Welding.
    -   Cylinder head/bore/piston/block work.
    -   Suspension.
    -   Other work lacking internal capacity.
2.  Ancillary job vendors:
    -   OEM-authorized work that must be outsourced.

Rules:

-   SA initiates send-out.
-   Job card pauses.
-   Floor In-Charge logs reason.
-   Same technician resumes on return.
-   Vendor cost adds to job-card total.
-   Vendor pause status is `paused-vendor`.
-   During vendor pause, SA and Floor In-Charge have exclusive
    operational access.
-   Workshop Manager and GM have read-only visibility, with GM retaining
    intervention authority.

## 5.17 Breakdown In-Charge

-   Based at Sedam Road but handles breakdowns across all workshops.
-   Alerts come from WhatsApp and QRT app.
-   Attend SLA: 2 hours.
-   Resolve SLA: 24 hours.
-   Handles location, complaint, warranty scope, dispatch, and team
    coordination.
-   Team composition may change between initial attendance and refit.
-   Breakdown job card is created under Breakdown in OEM CRM/DMS.
-   Breakdown job cards skip Security and Reception.
-   They rejoin the standard flow at Billing.
-   Track:
    -   Response vehicle fuel and odometer.
    -   General expenses.
    -   Deputation charges.
    -   Staff travel.
    -   Maintenance.
    -   OT.
    -   DA.
-   Breakdown In-Charge sees current workload and technician
    availability specifically.

## 5.18 Tools In-Charge and safety

-   Entirely tool inventory and issuance focused.
-   No job-card visibility for ordinary tool duties.
-   Special tool issuance tracks accountability by technician, not job
    card.
-   Each tool asset has an asset number; small tools/sets may share a
    bundled number.
-   Tracks inward, broken, lost, and lost-and-found.
-   Condition audit default is weekly and configurable.
-   Cadence configuration is available only to Workshop Manager/GM.
-   Tools In-Charge is phone-only and has no admin settings access.
-   Also acts as floor safety officer.
-   Can log safety incidents and unsafe conditions.
-   Can view safety compliance.
-   Runs per-job safety checklist.
-   Checklist items are configurable through setup wizard.
-   Reports unwanted materials on the floor daily.
-   Tool purchase approval routes to GM.

## 5.19 CSC/CRO

-   Two ticket managers handle GPS/telematics diagnostic alerts.
-   Calls customer and guides them to nearest workshop.
-   A referred customer creates a pre-arrival service request.
-   Service request is not automatically linked by VRN.
-   Reception manually matches it at gate-in.
-   If customer goes elsewhere, ticket is closed as not converted.
-   CSC/CRO access to resulting job-card details ends once reception
    matches it.
-   CSC/CRO may view the overall list of vehicles entered, read-only.
-   CRO handles service reminders.
-   Call-response tracker must capture the full response, not just
    reminded/not reminded.
-   CSC/CRO involvement is optional and applies only to referred
    customers.

## 5.20 Housekeeping and drivers

-   Housekeeping is an attendance record only, not an operational
    entity.
-   No separate plain-driver role.
-   Breakdown drivers also handle test drives and other driving work.
-   Driver availability must be visible.
-   Driver is unavailable when dispatched for breakdown, vendor run,
    courier, or parts pickup.

------------------------------------------------------------------------

# 6. PERMISSIONS MODEL

Permissions must cover both:

1.  Data access:
    -   View rights.
    -   Edit rights.
    -   Field-level restrictions.
    -   Status-based restrictions.
2.  Action-level control:
    -   Transitions.
    -   Approvals.
    -   Overrides.
    -   Corrections.
    -   Escalations.

Rules:

-   Permissions are strictly role-based.
-   Same role has the same permission set at every workshop.
-   Security cannot be marked absent.
-   No security fallback exists.
-   Attendance-driven role fallback is dynamic, not static.
-   A substitute receives only a narrow, purpose-built fallback
    permission set.
-   Substitute does not receive the full permission set of the absent
    role.
-   Backend must enforce permissions.
-   Frontend visibility is not a security boundary.

Confirmed permission decisions:

-   Security: create-only gate-in.
-   Reception: temporary correction rights only during reception stage.
-   Warranty Team and Billing: correction rights on Workshop Manager
    locked checks, with notification and acknowledgement.
-   QC: no correction rights on Workshop Manager checks.
-   SA: customer re-approval for estimate changes beyond ±10%.
-   Floor In-Charge: exclusive technician/bay assignment control and
    lock override.
-   Technician: active assigned jobs only plus aggregate floor queue.
-   Spare Parts: line-item edit rights limited to spare-part items and
    ±10% rule.
-   QC: only own verdict, inspection notes, and advisory note.
-   Warranty Team: paid-to-warranty/AMC/FMS classification change;
    cannot directly convert back to paid.
-   Billing: final line-item correction requires SA sign-off.
-   GM: blanket edit access with QC verdict and SA
    customer-communication exceptions.
-   Tools In-Charge: no admin settings access.
-   CSC/CRO: resulting job-card details inaccessible after reception
    matching.

------------------------------------------------------------------------

# 7. MEDIA, EVIDENCE, AND AUDIT

## 7.1 Evidence registry

Evidence/document registry must be visible across the whole process, not
siloed by module.

## 7.2 Photo standard

Every photo captured anywhere in the application must include:

-   Timestamp.
-   Geolocation metadata.

This applies to:

-   Gate-in.
-   Odometer.
-   Fuel gauge.
-   Attendance selfie.
-   Warranty evidence.
-   QC sign-off.
-   Any future photo-capture screen.

## 7.3 Retention

-   After job-card closure and vehicle gate-out, evidence media is
    purged and metadata remains.
-   Warranty evidence is retained in full until the warranty claim is
    settled.
-   After settlement, warranty evidence follows the normal
    purge-to-metadata rule.

## 7.4 Audit trail

Audit records must capture relevant:

-   Actor identity.
-   Role.
-   Workshop.
-   Timestamp.
-   Before/after values where applicable.
-   Reason or comment.
-   Approval state.
-   Source of action.
-   Related job card or domain record.

Technician-assignment lock overrides require:

-   Free-text reason.
-   Identity of the person making the override.
-   Timestamp.

------------------------------------------------------------------------

# 8. AI ASSISTANT AND KNOWLEDGE BASE

## 8.1 AI activity-log assistant

The system-wide activity log is the foundation for the AI assistant.

-   Everything in Workshop ERP v2 is recorded as an activity log.
-   AI has read access to the complete system-wide activity log.
-   AI is a broader operational assistant, not only a permission-matrix
    helper.
-   Example questions:
    -   What did technician Malappa do today?
    -   How many jobs did the technician complete?
    -   What was the technician's labour output?
-   AI-summary access is more privileged than normal role-based screen
    access.
-   AI access must not be treated as a reason to remove ordinary
    authorization controls.
-   AI assistant is exposed through a top-level AI mode toggle.
-   Dedicated AI/activity-log area is accessible only to GM and Super
    Admin.

## 8.2 Knowledge base

The AI knowledge base supports uploads of:

-   OEM circulars.
-   Rules.
-   Revisions.
-   Diagrams.
-   Case studies.
-   Checkpoint documents.
-   PDF files.
-   Images.

Upload rights are distributed by domain relevance:

-   Warranty staff upload warranty documents.
-   Spare Parts staff upload parts documents.
-   Other domain owners upload their relevant documents.
-   Upload access is not limited exclusively to GM/Super Admin.

AI suggestions must be:

1.  Grounded in the uploaded knowledge base.
2.  Grounded in actual workshop data.
3.  Relevant to the receiving role.
4.  Traceable to source documents and workshop records where possible.
5.  Explicit when evidence is missing or uncertain.
6.  Non-generic when real workshop information is available.

## 8.3 AI permission-matrix editor

-   Permission matrix is editable from the setup wizard.
-   Admin can describe a desired change in plain language.
-   AI translates the request into a structured proposed permission
    change.
-   Dedicated API endpoint is required.
-   Proposed changes are never applied directly on submission.
-   Human review and explicit confirmation are mandatory.
-   Store:
    -   Original request.
    -   AI proposal.
    -   Affected role and permissions.
    -   Validation results.
    -   Reviewer identity.
    -   Confirmation timestamp.
    -   Applied change.
    -   Before/after matrix.
-   AI must not bypass permission validation or audit logging.

------------------------------------------------------------------------

# 9. UI AND DEVICE STRATEGY

## 9.1 Device allocation

Phone/tablet only:

-   Technician.
-   QC.
-   Tools In-Charge.
-   Security.
-   Spare Parts picker.
-   Spare Parts oil room in-charge.

Desktop plus phone/tablet:

-   Reception.
-   Workshop Manager.
-   Floor In-Charge.
-   SA.
-   Billing.
-   Warranty Team.
-   GM Service.
-   Other applicable roles.

Spare Parts operators and manager use desktop.

## 9.2 UI principles

-   Minimal means progressive disclosure and fewest taps for the primary
    action.
-   Show only what is actionable now.
-   Hide secondary gating logic until relevant.
-   Search and menu layers must remain bounded by the user's
    entitlements.
-   Every list screen must support filter, sort, and/or search where
    applicable.
-   Job card remains the primary entry point for most roles.
-   Avoid complex interfaces for technicians and floor staff.
-   Do not use coloured borders as the only meaning indicator; provide
    clear labels, badges, or text.
-   Every blocked action must explain:
    -   Why it is blocked.
    -   What is required.
    -   Who must act next.

## 9.3 Known UI retrofit items

The following must be tracked and not forgotten:

1.  Add filter/sort/search to earlier list screens.
2.  Apply OT deduction before productivity split on:
    -   Technician My Performance.
    -   Floor In-Charge Team Productivity.
3.  Explicitly show timestamp and geotag requirements wherever photo
    capture exists.
4.  Validate all screens against the final business rules and permission
    matrix.

------------------------------------------------------------------------

# 10. DATA AND DOMAIN DESIGN DECISIONS

Confirmed decisions:

-   Job card ownership is the Service Adviser, always (owner-confirmed
    2026-09-20). Held as an identifier, never as a free-text name.
-   Technician fixed pairing is represented as a pair-ID tag on
    assignment records, not a standalone Pair entity.
-   Breakdown is a job-card type/subtype, not a fully separate
    operational entity.
-   One JobCard may have multiple WarrantyClaims.
-   Each WarrantyClaim covers its own subset of parts/labour.
-   CSC/CRO service requests that do not convert to a visit are closed
    as not converted.
-   Role fallback is attendance-driven and dynamic.
-   Housekeeping is attendance-only.
-   No separate plain-driver entity is required.
-   Driver availability is stored and changes based on dispatch
    assignments.
-   Approval entities remain separate:
    -   Discount.
    -   Credit.
    -   Overtime.
    -   Tool purchase.
-   Do not collapse genuinely different approval domains into one
    generic table merely for convenience.
-   Live `waiting-on` state is required on the job card:
    -   Who/what it is waiting on.
    -   Since when.
    -   Tap-through to a fuller tracking table.
-   Technician concurrency rules must be enforced at the correct
    assignment level.
-   A lead may be active on multiple jobs.
-   An assistant is limited to one active started job for a given
    vehicle and is released when the job pauses.

------------------------------------------------------------------------

# 11. AI/CODING AGENT WORK PROTOCOL

Every agent task should follow this sequence:

## Phase A --- Understand

1.  Read this file.
2.  Identify the requested business capability.
3.  Locate relevant business rules and existing implementation.
4.  List assumptions and unresolved questions.
5.  Do not edit yet.

## Phase B --- Inspect

Inspect:

-   Routes and API endpoints.
-   Database schema.
-   Migrations.
-   Services/domain logic.
-   Frontend components.
-   Permission middleware.
-   Audit logging.
-   Tests.
-   Configuration.
-   Related documentation.

Determine:

-   Current behaviour.
-   Intended behaviour.
-   Dependencies.
-   Regression risks.
-   Data migration implications.

## Phase C --- Plan

Produce a short implementation plan containing:

-   Files to modify.
-   Files to add.
-   Schema changes.
-   API changes.
-   Permission impact.
-   Audit impact.
-   Test plan.
-   Rollback or safety considerations.

If a business rule is ambiguous, stop for owner clarification.

## Phase D --- Implement

-   Make the smallest coherent change.
-   Keep domain logic separate from UI.
-   Validate inputs server-side.
-   Enforce authorization server-side.
-   Add audit events for meaningful state changes.
-   Avoid hardcoded workshop-specific values when setup configuration is
    required.
-   Do not fabricate OCR, activity-log, inventory, or employee data.
-   Preserve backward compatibility where required.

## Phase E --- Verify

Run relevant tests and checks:

-   Type checking.
-   Linting.
-   Unit tests.
-   Integration tests.
-   Migration/schema validation.
-   Permission tests.
-   Workflow transition tests.
-   Audit-log tests.
-   Build validation.

Report exact results. Never claim tests passed if they were not run.

## Phase F --- Update memory

After completion:

-   Update this file if a durable decision changed.
-   Update the relevant design/specification document.
-   Add a changelog entry when appropriate.
-   Record:
    -   Date.
    -   Change.
    -   Reason.
    -   Files affected.
    -   Tests run.
    -   Known limitations.
    -   Pending follow-up.

------------------------------------------------------------------------

# 12. CHANGE RECORD

## Initial baseline

-   **Date:** 2026-09-19
-   **Baseline:** Workshop ERP v2 business rules, UI/device strategy,
    permissions decisions, schema decisions, and AI-layer requirements
    consolidated into this file.
-   **Purpose:** Shared memory for VS Code, Antigravity, Claude Code,
    and other coding agents.
-   **Status:** Living baseline; implementation must be checked against
    the repository before modification.

------------------------------------------------------------------------

# 13. OPEN ITEMS / DO NOT INVENT

The following require explicit design or owner confirmation before
implementation if not already documented elsewhere:

-   Final technology stack and repository architecture for the clean
    rebuild.
-   Final database schema and migration strategy.
-   Exact activity-log event catalogue.
-   AI provider, model routing, cost controls, and fallback behaviour.
-   Knowledge-base chunking, embedding, retrieval, and document
    versioning design.
-   AI data masking and sensitive-data handling.
-   Exact setup-wizard permission schema and proposal validation format.
-   Exact role list and role identifiers in the production database.
-   Final SLA values where only the existence of configurability is
    defined.
-   OCR provider and extraction confidence/approval workflow.
-   OEM CRM and Workshop Automation integration contracts.
-   Multi-workshop tenancy and data-isolation strategy.
-   Offline behaviour for phone/tablet workflows.
-   Media storage, retention jobs, and purge verification.
-   Production deployment, backup, recovery, and observability strategy.

Agents must not fill these gaps with generic assumptions. Raise them as
explicit decisions.

------------------------------------------------------------------------

# 14. FINAL RULE

**Build what the owner has defined. Inspect before changing. Never guess
silently. Enforce permissions server-side. Log important actions. Test
business rules. Update this memory file after durable decisions.**
