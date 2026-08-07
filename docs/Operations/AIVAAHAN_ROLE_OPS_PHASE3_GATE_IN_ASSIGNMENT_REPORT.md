# AIVAAHAN-ROLE-OPS-IMPL-003 PHASE 3 — GATE-IN → RECEPTION → MANAGER ASSIGNMENT REAL-TIME OWNERSHIP PIPELINE REPORT

**PRODUCT:** AiVaahan DWIP Enterprise Platform  
**REFERENCE DEPLOYMENT:** Devanand Automobiles  
**PILOT LOCATION:** Sedam Road Workshop  
**STATUS:** PHASE 3 REAL-TIME OWNERSHIP PIPELINE IMPLEMENTED & VERIFIED  

---

## 1. EXECUTIVE SUMMARY

The Phase 3 **Gate-In → Reception → Manager Assignment Real-Time Ownership Pipeline** has been successfully architected, implemented, and verified. This pipeline transforms vehicle intake into a deterministic, role-specific, 5-minute SLA-governed ownership progression.

When a vehicle arrives at the Sedam Road workshop gate:
1. **Security Gate**: Captures vehicle plate, ANPR/OCR plate & odometer, driver details, and creates an immutable Gate-In event & VOS session with a 5-minute handoff timer to Reception (`SLA_GATE_TO_RECEPTION`).
2. **Vehicle Passport Recognition**: Looks up VIN, customer/fleet, service history summary, open campaigns, and warranty status with clear data source attribution (`LOCAL_CACHE`, `DWIP_DATA`, `LIVE_EXTERNAL`, `UNAVAILABLE`).
3. **Reception Desk (`MY NEW ARRIVALS`)**: Receptionist accepts vehicle, generates a unique, branch-scoped date-aware token (`SEDAM-20260803-001`), records preliminary visit classification, and verifies/corrects odometer (preserving original captured OCR reading). Ownership transfers to Reception and starts a 5-minute handoff timer to Manager (`SLA_RECEPTION_TO_MANAGER`).
4. **Manager Assignment (`MY ASSIGNMENTS PENDING`)**: Service Manager reviews vehicle intake, evaluates AI/Rule SA Recommendation (factoring shift status, active JCs, LOB competency, and fleet continuity), executes `[ ACCEPT RECOMMENDATION ]` or `[ OVERRIDE ]` with mandatory governance logging.
5. **Atomic SA Assignment**: Ownership transfers atomically to the assigned Service Advisor, creating/updating the Job Card and immediately surfacing the vehicle in the SA's Phase 2 `MY ATTENTION` and `MY VEHICLES TODAY` workspaces.

---

## 2. STAGE-BY-STAGE IMPLEMENTATION BREAKDOWN

| Stage | Operational Action | Role Owner | Key Data & Output | SLA / Escalation |
| :--- | :--- | :--- | :--- | :--- |
| **01. Vehicle Arrival** | `[ CAPTURE VEHICLE ]` | Security Agent | VRN, Front Photo, Odometer Photo & OCR, Driver Details, Gate # | 5-min timer created (`SLA_GATE_TO_RECEPTION`) |
| **02. Recognition** | Passport Lookup | System Engine | VIN, Customer/Fleet, History, Open Campaigns, Warranty Status | Source Tagged (`LOCAL_CACHE` / `DWIP_DATA`) |
| **03-06. Reception Intake** | `[ ACCEPT VEHICLE ]` | Receptionist | Token (`SEDAM-YYYYMMDD-SEQ`), Visit Category, Odometer Verification | SLA Timer reset (`SLA_RECEPTION_TO_MANAGER`) |
| **07-08. Manager Queue** | Recommendation Review | Workshop Manager | AI SA Rec, Workload Count, LOB Competency, Override Reason | 5-min timer created (`SLA_MANAGER_TO_SA`) |
| **09. SA Handoff** | Atomic SA Assignment | Workshop Manager | Job Card Created, VOS Ownership Transferred to SA | Immediately in SA Phase 2 `MY WORKSPACE` |

---

## 3. 5-MINUTE HANDOFF SLA & ESCALATION ENGINE

- **Rule**: No actionable handoff between operational roles may remain unattended for longer than 5 minutes (300 seconds).
- **Tracking Table**: `tbl_handoff_sla` (`stage_name`, `entity_id`, `owner_id`, `owner_role`, `created_at`, `accepted_at`, `sla_due_at`, `status`, `escalation_level`, `branch_id`).
- **Escalation Levels**:
  - Level 0: `ON_TRACK` (0–4 minutes elapsed)
  - Level 1: `WARNING` (4–5 minutes elapsed)
  - Level 2: `BREACHED` (>5 minutes elapsed; automatically logged in VOS Timeline & surfaced in Manager Exception Feed)

---

## 4. SECURITY & AUTHORIZATION BOUNDARIES

1. **Security Agent**: Can capture vehicle arrivals & log Gate-In entries. Cannot accept reception intake or assign Service Advisors.
2. **Receptionist**: Can accept reception arrivals, generate tokens, verify odometer, set preliminary job classification. Cannot assign Service Advisors.
3. **Service Advisor**: Cannot self-assign unassigned vehicles or modify manager assignment logs. Access is strictly scoped to assigned vehicles.
4. **Workshop Manager / Service Manager**: Can assign Service Advisors within authorized branch scope (`req.user.branchId`). Mandatory governance logging for AI recommendation overrides.

---

## 5. AUTOMATED TEST & VERIFICATION RESULTS

- **Test Suite**: `src/tests/role_ops_phase3_pipeline.test.ts`
- **Result**: **7 / 7 PASSED (100%)**
  - `✓ 1. STAGE 01: Creates immutable Gate-In event & 5-minute SLA timer`
  - `✓ 2. STAGE 02: Performs Vehicle Passport Lookup from historical visits`
  - `✓ 3. STAGE 03-06: Accepts Reception Intake, generates branch-scoped token & preserves original OCR odometer`
  - `✓ 4. STAGE 07-08: Queries Manager Pending Queue and generates AI SA recommendation`
  - `✓ 5. STAGE 09: Manager assigns Service Advisor and transfers ownership`
  - `✓ 6. SECURITY: Rejects unauthorized SA self-assignment`
  - `✓ 7. 5-MINUTE SLA ENGINE: Evaluates SLA breaches and triggers escalation event`
