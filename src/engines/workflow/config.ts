// =============================================================================
// WOS Workflow Configuration (Phase 4)
// Bounded Context: Workflow Operations / Configuration Management
// =============================================================================

export interface StateConfig {
  allowedTransitions: string[];
  allowedRoles: string[];
  targetQueue: string;
  slaLimitMinutes: number;
}

export const WORKFLOW_CONFIG: Record<string, StateConfig> = {
  GATE_IN: {
    allowedTransitions: ["INTAKE_PENDING"],
    allowedRoles: ["Security", "Service Advisor", "Supervisor", "Admin"],
    targetQueue: "INTAKE_QUEUE",
    slaLimitMinutes: 15,
  },
  INTAKE_PENDING: {
    allowedTransitions: ["DIAGNOSTIC_WIP"],
    allowedRoles: ["Service Advisor", "Supervisor", "Admin"],
    targetQueue: "INTAKE_QUEUE",
    slaLimitMinutes: 30,
  },
  DIAGNOSTIC_WIP: {
    allowedTransitions: ["ESTIMATE_PENDING"],
    allowedRoles: ["Technician", "Foreman", "Supervisor", "Admin"],
    targetQueue: "DIAGNOSTIC_QUEUE",
    slaLimitMinutes: 60,
  },
  ESTIMATE_PENDING: {
    allowedTransitions: ["ESTIMATE_APPROVED", "GATE_OUT"],
    allowedRoles: ["Service Advisor", "Supervisor", "Admin"],
    targetQueue: "WIP_QUEUE",
    slaLimitMinutes: 120, // Approval limit
  },
  ESTIMATE_APPROVED: {
    allowedTransitions: ["PARTS_PENDING", "WIP_START"],
    allowedRoles: ["Service Advisor", "Supervisor", "Admin"],
    targetQueue: "WIP_QUEUE",
    slaLimitMinutes: 30,
  },
  PARTS_PENDING: {
    allowedTransitions: ["WIP_START"],
    allowedRoles: ["Technician", "Foreman", "Supervisor", "Admin"],
    targetQueue: "WIP_QUEUE",
    slaLimitMinutes: 240, // Parts procurement wait limit
  },
  WIP_START: {
    allowedTransitions: ["QC_PENDING"],
    allowedRoles: ["Technician", "Foreman", "Supervisor", "Admin"],
    targetQueue: "WIP_QUEUE",
    slaLimitMinutes: 180, // Average service time limit
  },
  QC_PENDING: {
    allowedTransitions: ["QC_FAILED", "FINAL_REVIEW"],
    allowedRoles: ["QC Inspector", "Foreman", "Supervisor", "Admin"],
    targetQueue: "QC_QUEUE",
    slaLimitMinutes: 45,
  },
  QC_FAILED: {
    allowedTransitions: ["WIP_START"],
    allowedRoles: ["QC Inspector", "Foreman", "Supervisor", "Admin"],
    targetQueue: "QC_QUEUE",
    slaLimitMinutes: 30,
  },
  FINAL_REVIEW: {
    allowedTransitions: ["INVOICED"],
    allowedRoles: ["Cashier", "Service Advisor", "Supervisor", "Admin"],
    targetQueue: "DELIVERY_QUEUE",
    slaLimitMinutes: 30,
  },
  INVOICED: {
    allowedTransitions: ["GATE_OUT"],
    allowedRoles: ["Cashier", "Service Advisor", "Supervisor", "Admin"],
    targetQueue: "DELIVERY_QUEUE",
    slaLimitMinutes: 15,
  },
  GATE_OUT: {
    allowedTransitions: [], // Terminal State
    allowedRoles: ["Security", "Service Advisor", "Supervisor", "Admin"],
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
