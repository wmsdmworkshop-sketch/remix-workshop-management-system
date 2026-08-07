# AIVAAHAN_AI_DECISION_POINT_MATRIX.md — AI & Intelligence Decision-Point Integration Matrix

## 📌 Executive Summary & Operating Principle

In the AiVaahan DWIP platform, **AI intelligence is embedded directly inside operational users' "MY" workspaces**, rather than isolated in generic AI dashboards. 

Every AI recommendation is **advisory** and requires human review. AI never bypasses mandatory human approval authority. Furthermore, every AI recommendation and human decision (`ACCEPT` / `OVERRIDE`) is logged to `tbl_workflow_history` to continuously measure recommendation accuracy over time.

---

## 🤖 Lifecycle Stage AI Decision-Point Matrix

| Stage | AI Capability | Input Data Used | AI Generated Recommendation | Recipient Role | Advisory / Authoritative | Human Override Authority | Recommendation Audit Log | Decision Audit Log | Accuracy Metric Tracked |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **02. Intake** | **ANPR/OCR Plate Matching AI** | Plate image, `stg_vehicle_master` | Matched VRN + Confidence Score | Security In-charge | Advisory | YES (Manual VRN Edit) | `tbl_evidence.ocr_results` | `vos.registration_number` | OCR Recognition Accuracy % |
| **06. Advisor Assign**| **SA Workload & Skill Match AI** | Active advisor JCs, AMC skill level | Recommended Service Advisor | Service Manager | Advisory | YES (Re-assign to another SA)| `ai_recommendations` | `vos_owner_history` | Load Balance Efficiency % |
| **08. History Audit**| **Repeat-Repair Detection AI** | 360° Vehicle Passport history | Flagged recurring defect within 30 days | Service Advisor | Advisory | YES (Acknowledge / Dismiss) | `ai_recommendations` | `job_cards.delay_notes` | Repeat Repair Prevention % |
| **11-12. Bay & Tech** | **Bay & Technician Matching AI**| Vehicle model, bay lift status, tech cert| Recommended Bay ID & Lead Technician | Floor Supervisor | Advisory | YES (Manual Allocation) | `technician-models.ts:17` | `job_technician_maps` | Technician Skill Match % |
| **14. Parts** | **Predictive Parts Requisition AI** | Complaint text, OEM job code | Suggested spare parts list + quantities | Parts Clerk / SA | Advisory | YES (Add / Remove Parts) | `parts-models.ts` | `parts_allocation-engine.ts`| Parts Suggestion Accuracy %|
| **15. Warranty** | **AI Warranty Adjudicator v1.1** | Failed part photos, thermal load data | Warranty Claim Eligibility % + Reason | Warranty Advisor | Advisory | YES (Manual Claim Submission)| `ai_recommendations` | `warranty_claims` | Claim Approval Pass Rate % |
| **16. ETA Engine** | **AI Delivery Prediction Engine** | Bay load, technician speed, parts SLA | Recommended Committed ETD | Service Advisor | Advisory | YES (Adjust ETD) | `job_cards.ai_delivery_prediction` | `job_cards.etd` | On-Time Delivery SLA % |
| **20. SLA Risk** | **AI Delay & Breach Predictor** | Work progress, elapsed timer | Breach Alert Risk Score (Low/Med/High) | Works Manager | Advisory | YES (Trigger Extension) | `vos.risk_score` | `l1_delay` / `l2_delay` | Breach Prediction Accuracy %|
| **22. QC Audit** | **AI QC Risk Predictor** | Technician rework history, repair type | High-Risk Rework Warning | QC Inspector | Advisory | YES (Perform Deep Audit) | `quality-models.ts` | `rework_logs` | First-Time-Right Rate % |
| **28. Executive** | **DP Exception Intelligence AI** | Live VOS events, overdue handoffs | Top 3 Operational Risk Escalations | Dealer Principal | Advisory | YES (Take Action) | `dashboard-models.ts` | `alert_logs` | Escalation Resolution Time |

---

## 📱 Contextual Embedding in "MY" Workspaces

```text
MY NEW ASSIGNMENTS (Service Manager View)
┌─────────────────────────────────────────────────────────────────┐
│ Vehicle: KA-32-F-4589 (Tata Signa 2823.K)                       │
│ 🤖 AI Recommendation: Assign to Shashi Patil (Confidence: 94%)  │
│ Reason: Shashi has lowest active HCV load (2 JCs) & HCV Cert.   │
│ [ ACCEPT RECOMMENDATION ]   [ OVERRIDE & SELECT ADVISOR ]       │
└─────────────────────────────────────────────────────────────────┘
```

When the Service Manager taps **[ACCEPT RECOMMENDATION]**:
1. `vos_owner_history` logs: `previous_owner: SYSTEM_AI`, `new_owner: Shashi Patil`, `handover_type: AI_ACCEPTED`.
2. `tbl_workflow_history` logs: `event_type: AI_SUGGESTION_ACCEPTED`, `confidence: 0.94`.
3. If **[OVERRIDE]** is tapped, the manager selects another advisor, logging `event_type: AI_SUGGESTION_OVERRIDDEN` with the manager's override reason.
