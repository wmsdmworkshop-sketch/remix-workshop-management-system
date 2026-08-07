# AIVAAHAN_APPROVAL_AUTHORITY_MATRIX.md — Authoritative Approval & Governance Matrix

## 📌 Executive Summary

This document specifies the **Approval & Authority Matrix** for the AiVaahan DWIP platform. It establishes strict rules for ETA Time Extensions, Additional Defect Approvals, Financial Credit Authorizations, Rework Approvals, and Customer Approval Evidence.

---

## 🕒 1. ETA Extension Governance Rules

No ETA or time extension may occur without a **mandatory reason** and an immutable audit log. Original estimated duration (`etd`) must remain preserved in history (`job_cards.etd`).

### Authority Threshold Matrix

| Extension Duration | Required Approver | Mandatory Documentation | Governance Enforcement |
| :--- | :--- | :--- | :--- |
| **Up to 60 Minutes ($\le$ 1 Hour)** | Works Manager / Workshop Manager | Category reason + updated part/labor notes | `l1_delay` logged |
| **60 to 120 Minutes (1 to 2 Hours)** | Works Manager AND Service Manager | Technical justification + customer notification confirmation | `l2_delay` logged |
| **Greater than 120 Minutes (> 2 Hours)**| **General Manager (`general_manager`)** | Detailed RCA explanation + GM override signature | `l3_delay` logged; **NO BYPASS** |
| **Repeated Extensions ($\ge$ 3 Extensions)**| **General Manager (`general_manager`)** | Formal Exception Review + GM Approval | **NO BYPASS** |

---

## 🛠️ 2. Additional Finding / Defect Approval Loop

No unapproved repair work may enter execution.

```text
TECHNICIAN FINDING (Hidden defect discovered)
  │
  ▼
FLOOR IN-CHARGE REVIEW (Verifies defect & labor requirements)
  │
  ▼
PARTS / WARRANTY CHECK (Verifies spare parts pricing & warranty coverage)
  │
  ▼
REVISED ESTIMATE (Service Advisor generates supplementary estimate)
  │
  ▼
CUSTOMER APPROVAL (Customer signs digital estimate / transmits evidence)
  │
  ▼
WORK AUTHORIZATION (Advisor unlocks job lines for technician execution)
```

---

## 📝 3. Customer Approval Evidence Governance

Acceptable customer approval evidence formats:
1. **Digital Signature**: Captured via mobile web portal (`digital_approvals.signature_url`).
2. **SMS Confirmation**: OTP/Link confirmation log.
3. **WhatsApp Approval**: Image screenshot of chat confirmation (`tbl_evidence`).
4. **Voice Note / Audio Call Recording**: Audio clip uploaded to media vault (`tbl_evidence.mime_type = 'audio/mp3'`).
5. **Fleet / Maintenance Manager Approval**: Fleet authorization PO/email reference.
6. **Emergency Manager Override**: Permitted **ONLY** under recorded GM override rules.

Every customer approval record must store:
- `approval_type` (`DIGITAL_SIGNATURE`, `SMS_OTP`, `WHATSAPP_SCREENSHOT`, `VOICE_NOTE`, `FLEET_PO`, `GM_OVERRIDE`)
- `approver_identity` & `contact_mobile`
- `timestamp`
- `approved_amount`
- `estimate_version`
- `evidence_reference_id` (`tbl_evidence.evidence_id`)
- `recorded_by_user_id`

---

## 💰 4. Payment & Credit Governance

### Strict Credit Approval Rule
- **Credit Request Origin**: Initiated **ONLY** by Billing Personnel or Cashier.
- **Credit Approval Authority**: Authorized **ONLY** by the **General Manager (`general_manager`)**.
- **NO OTHER ROLE MAY APPROVE CREDIT**. Service Advisors, Workshop Managers, and Billing Clerks are strictly prohibited from granting credit terms.

### Physical Custody vs Financial Liability
- A GM-approved credit clearance allows **physical Gate-Out** of the vehicle.
- GM credit approval **DOES NOT** close financial liability.
- Outstanding balances remain tracked in **Accounts Receivable / Liability Tracking** until full cash/bank settlement is logged by the Cashier.

---

## 🔍 5. QC / Rework Loop Governance

Quality Control is **never a simple checkbox**.

```text
WORK COMPLETE (Technician completes repair)
  │
  ▼
FLOOR CONFIRMATION (Floor In-charge verifies completion)
  │
  ▼
QC INSPECTION (QC In-charge performs 25-point audit)
  ├───────────────────────────────┐
  ▼                               ▼
QC PASS                        QC FAIL
  │                               │
  ▼                               ▼
READY FOR BILLING              REASON LOGGED (`rework_logs`)
                                  │
                                  ▼
                               JOB REOPENED & RETURNED TO BAY
                                  │
                                  ▼
                               REWORK TIMER STARTED
                                  │
                                  ▼
                               RE-INSPECTION (RE-QC)
```

### Metrics Tracked Automatically
- **First-Time-Right Rate (FTR %)**
- **Rework Count per Job Card**
- **Rework Duration (Minutes)**
- **QC Failure Reason Classification** (`WORKMANSHIP`, `PARTS_DEFECT`, `MISDIAGNOSIS`, `CLEANLINESS`)
- **Responsible Technician / Bay ID**
