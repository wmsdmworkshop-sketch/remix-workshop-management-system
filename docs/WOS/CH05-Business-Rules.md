---
Document ID: WOS-CH05
Title: Chapter 5 - Enterprise Business Rules
Version: 1.1.0
Status: APPROVED
Owner: DWIP Core Architecture Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-30
Updated Date: 2026-07-30
Dependencies: DWIP-WOS-001
Description: Business rules, odometer immutability, complaint audit history, and labor revenue split policies.
---

# Chapter 5: Enterprise Business Rules

---

## 1. Immutability Rules
- **Odometer Immutability**: Odometer readings recorded at Gate Entry cannot be reduced or altered without an explicit AI/Management override audit log.
- **Complaint History Audit**: Original customer complaint text is preserved immutably in `job_card_complaint_history` upon editing.
- **Timestamp Integrity**: `created_at` and `gate_in_time` timestamps are immutable once saved.

---

## 2. Revenue & Labor Allocation Rules
- **Labor Revenue Split**: Standardized percentage splits computed by `revenue-split-engine.ts` based on primary technician, co-technician, and electrician roles.
- **Warranty Claim Safeguards**: Free service / warranty claims require verified causal part prefixes and policy applicability checks before approval.
