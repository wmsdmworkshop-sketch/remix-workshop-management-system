import { WorkflowDefinition, EvidenceProfile, ApprovalProfile } from "../../core/workflow-registry";
import { ApprovalLevels, ClaimStatus } from "./config/constants";

export const WarrantyEvidenceProfile: EvidenceProfile = {
  "Internal Review": [
    { evidence_type: "VIN_PHOTO", is_mandatory: true, min_quantity: 1 },
    { evidence_type: "ODOMETER_PHOTO", is_mandatory: true, min_quantity: 1 },
    { evidence_type: "CUSTOMER_COMPLAINT_DOC", is_mandatory: true, min_quantity: 1 },
    { evidence_type: "DIAGNOSTIC_REPORT", is_mandatory: true, min_quantity: 1 },
    { evidence_type: "FAILED_PART_PHOTO", is_mandatory: true, min_quantity: 1 }
  ],
  "Ready for OEM Submission": [
    { evidence_type: "TECHNICIAN_FINDINGS", is_mandatory: true, min_quantity: 1 },
    { evidence_type: "QC_CHECKLIST", is_mandatory: true, min_quantity: 1 },
    { evidence_type: "CUSTOMER_SIGNATURE", is_mandatory: true, min_quantity: 1 }
  ]
};

export const WarrantyApprovalProfile: ApprovalProfile = {
  profile_id: "WARRANTY_STANDARD_APPROVAL",
  strategy: "Sequential",
  auto_escalate: true,
  steps: [
    { step_id: "STEP_1", allowed_roles: [ApprovalLevels.SERVICE_ADVISOR], is_mandatory: true, sla_minutes: 60 },
    { step_id: "STEP_2", allowed_roles: [ApprovalLevels.WORKSHOP_MANAGER], is_mandatory: true, sla_minutes: 120 },
    { step_id: "STEP_3", allowed_roles: [ApprovalLevels.WARRANTY_MANAGER], is_mandatory: true, sla_minutes: 120 }
  ]
};

export const WarrantyPolicyProfile = {
  profile_id: "WARRANTY_STANDARD_POLICY",
  rules: [
    { rule_name: "VEHICLE_AGE_CHECK", type: "CONDITION", expression: "vehicle.age_months <= warranty.period_months" },
    { rule_name: "KILOMETERS_CHECK", type: "CONDITION", expression: "vehicle.odometer <= warranty.max_kilometers" },
    { rule_name: "REPEAT_FAILURE_CHECK", type: "VALIDATION", expression: "history.hasRepeatFailure(part_number, 90_days) == false" },
    { rule_name: "FSB_APPLICABILITY", type: "EVALUATION", expression: "campaigns.hasActiveFSB(vehicle.vin)" }
  ]
};

export const WarrantyWorkflowDefinition: WorkflowDefinition = {
  workflow_type: "Warranty",
  strategy_name: "WarrantyStrategy",
  policy_profile: WarrantyPolicyProfile.profile_id,
  evidence_profile: WarrantyEvidenceProfile,
  approval_profile: WarrantyApprovalProfile.profile_id,
  notification_profile: "WARRANTY_NOTIFICATIONS",
  retention_profile: "WARRANTY_RETENTION",
  sla_profile: "WARRANTY_SLA",
  state_machine: {
    workflow_type: "Warranty",
    initial_state: "Vehicle Received",
    states: [
      "Vehicle Received", "Job Card Created", "Warranty Suspected",
      "Eligibility Check", "Evidence Collection", "Technical Inspection",
      "Internal Review", "Approval", "Ready for OEM Submission",
      "Submitted", "OEM Review", "Clarification Requested",
      "Resubmitted", "Approved", "Rejected", "Settlement", 
      "Recovery Posting", "Closed"
    ],
    transitions: {
      "Vehicle Received": ["Job Card Created"],
      "Job Card Created": ["Warranty Suspected"],
      "Warranty Suspected": ["Eligibility Check"],
      "Eligibility Check": ["Evidence Collection", "Rejected"],
      "Evidence Collection": ["Technical Inspection"],
      "Technical Inspection": ["Internal Review"],
      "Internal Review": ["Approval"],
      "Approval": ["Ready for OEM Submission", "Rejected"],
      "Ready for OEM Submission": ["Submitted"],
      "Submitted": ["OEM Review"],
      "OEM Review": ["Approved", "Rejected", "Clarification Requested"],
      "Clarification Requested": ["Resubmitted"],
      "Resubmitted": ["OEM Review"],
      "Approved": ["Settlement"],
      "Settlement": ["Recovery Posting"],
      "Recovery Posting": ["Closed"],
      "Rejected": ["Closed"],
      "Closed": []
    }
  }
};
