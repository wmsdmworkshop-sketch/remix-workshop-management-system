// =============================================================================
// WOS Workflow Configuration (Phase 4)
// Bounded Context: Workflow Operations / Configuration Management
// =============================================================================

export interface StateConfig {
  allowedTransitions: string[];
  requiredPermission: string;
  targetQueue: string;
  slaLimitMinutes: number;
}

export const WORKFLOW_CONFIG: Record<string, StateConfig> = {
  GATE_IN: {
    allowedTransitions: ["INTAKE_PENDING"],
    requiredPermission: "WORKFLOW_TRANSITION_GATE_IN",
    targetQueue: "INTAKE_QUEUE",
    slaLimitMinutes: 15,
  },
  INTAKE_PENDING: {
    allowedTransitions: ["DIAGNOSTIC_WIP"],
    requiredPermission: "WORKFLOW_TRANSITION_INTAKE_PENDING",
    targetQueue: "INTAKE_QUEUE",
    slaLimitMinutes: 30,
  },
  DIAGNOSTIC_WIP: {
    allowedTransitions: ["ESTIMATE_PENDING"],
    requiredPermission: "WORKFLOW_TRANSITION_DIAGNOSTIC_WIP",
    targetQueue: "DIAGNOSTIC_QUEUE",
    slaLimitMinutes: 60,
  },
  ESTIMATE_PENDING: {
    allowedTransitions: ["ESTIMATE_APPROVED", "GATE_OUT"],
    requiredPermission: "WORKFLOW_TRANSITION_ESTIMATE_PENDING",
    targetQueue: "WIP_QUEUE",
    slaLimitMinutes: 120, // Approval limit
  },
  ESTIMATE_APPROVED: {
    allowedTransitions: ["PARTS_PENDING", "WIP_START"],
    requiredPermission: "WORKFLOW_TRANSITION_ESTIMATE_APPROVED",
    targetQueue: "WIP_QUEUE",
    slaLimitMinutes: 30,
  },
  PARTS_PENDING: {
    allowedTransitions: ["WIP_START"],
    requiredPermission: "WORKFLOW_TRANSITION_PARTS_PENDING",
    targetQueue: "WIP_QUEUE",
    slaLimitMinutes: 240, // Parts procurement wait limit
  },
  WIP_START: {
    allowedTransitions: ["QC_PENDING"],
    requiredPermission: "WORKFLOW_TRANSITION_WIP_START",
    targetQueue: "WIP_QUEUE",
    slaLimitMinutes: 180, // Average service time limit
  },
  QC_PENDING: {
    allowedTransitions: ["QC_FAILED", "FINAL_REVIEW"],
    requiredPermission: "WORKFLOW_TRANSITION_QC_PENDING",
    targetQueue: "QC_QUEUE",
    slaLimitMinutes: 45,
  },
  QC_FAILED: {
    allowedTransitions: ["WIP_START"],
    requiredPermission: "WORKFLOW_TRANSITION_QC_FAILED",
    targetQueue: "QC_QUEUE",
    slaLimitMinutes: 30,
  },
  FINAL_REVIEW: {
    allowedTransitions: ["INVOICED"],
    requiredPermission: "WORKFLOW_TRANSITION_FINAL_REVIEW",
    targetQueue: "DELIVERY_QUEUE",
    slaLimitMinutes: 30,
  },
  INVOICED: {
    allowedTransitions: ["GATE_OUT"],
    requiredPermission: "WORKFLOW_TRANSITION_INVOICED",
    targetQueue: "DELIVERY_QUEUE",
    slaLimitMinutes: 15,
  },
  GATE_OUT: {
    allowedTransitions: [], // Terminal State
    requiredPermission: "WORKFLOW_TRANSITION_GATE_OUT",
    targetQueue: "DELIVERY_QUEUE",
    slaLimitMinutes: 0,
  },
};

// Feature Flags for Rollout
export const FEATURE_FLAGS = {
  enableWosWorkflowEngine: true, // Master flag
  enableSlaAlerts: true,          // Guard for SLA alerts
  enableDecisionOverrides: true,  // Guard for manager bypass log
  enableEventPublishing: true,    // Guard for event handlers
};
