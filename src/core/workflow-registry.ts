import { StateMachineConfig } from "./workflow-state-machine";

export interface EvidenceRequirement {
  evidence_type: string;
  is_mandatory: boolean;
  min_quantity: number;
  validation_rules?: string[];
  version_requirement?: "LATEST" | "ANY";
  approval_requirement?: "REQUIRED" | "OPTIONAL" | "NONE";
}

export type EvidenceProfile = Record<string, EvidenceRequirement[]>;

export type ApprovalStrategy = "Sequential" | "Parallel" | "AnyOne" | "AllRequired" | "Quorum" | "Conditional";

export interface ApprovalStep {
  step_id: string;
  allowed_roles: string[];
  is_mandatory: boolean;
  sla_minutes?: number;
}

export interface ApprovalProfile {
  profile_id: string;
  strategy: ApprovalStrategy;
  quorum_count?: number;
  steps: ApprovalStep[];
  auto_escalate: boolean;
}

export interface WorkflowDefinition {
  workflow_type: string;
  strategy_name: string;
  state_machine: StateMachineConfig;
  policy_profile: string;
  evidence_profile: EvidenceProfile;
  approval_profile: string;
  notification_profile: string;
  retention_profile: string;
  sla_profile: string;
}

/**
 * Registry for Workflow Definitions.
 * Loads configuration from DB or uses file-based defaults for bootstrapping.
 */
export class WorkflowRegistry {
  private definitions: Map<string, WorkflowDefinition> = new Map();
  private approvalProfiles: Map<string, ApprovalProfile> = new Map();

  constructor() {
    this.bootstrapDefaults();
  }

  /**
   * Retrieves a workflow definition by type.
   */
  public getWorkflow(workflowType: string): WorkflowDefinition {
    const def = this.definitions.get(workflowType);
    if (!def) {
      throw new Error(`Workflow definition not found for type: ${workflowType}`);
    }
    return def;
  }

  /**
   * Registers or updates a workflow definition.
   */
  public registerWorkflow(definition: WorkflowDefinition): void {
    this.definitions.set(definition.workflow_type, definition);
  }

  public getApprovalProfile(profileId: string): Promise<ApprovalProfile | undefined> {
    return Promise.resolve(this.approvalProfiles.get(profileId));
  }

  public registerApprovalProfile(profile: ApprovalProfile): void {
    this.approvalProfiles.set(profile.profile_id, profile);
  }

  private bootstrapDefaults() {
    // Retail Default Workflow
    this.registerWorkflow({
      workflow_type: "Retail",
      strategy_name: "RetailStrategy",
      state_machine: {
        workflow_type: "Retail",
        states: [
          "Waiting", "GATE_IN", "INTAKE_PENDING", "ESTIMATE_PENDING", 
          "ESTIMATE_APPROVED", "ESTIMATE_REJECTED", "WIP_START", 
          "In Progress", "Carry Forward", "Rework", "Completed",
          "QC Passed", "QC Failed", "FINAL_REVIEW", "Awaiting Gate Out",
          "Invoiced", "Cancelled", "Closed"
        ],
        initial_state: "Waiting",
        transitions: {
          "Waiting": ["GATE_IN", "INTAKE_PENDING", "Cancelled", "In Progress"],
          "GATE_IN": ["INTAKE_PENDING", "Cancelled"],
          "INTAKE_PENDING": ["ESTIMATE_PENDING", "WIP_START", "Cancelled"],
          "ESTIMATE_PENDING": ["ESTIMATE_APPROVED", "ESTIMATE_REJECTED", "Cancelled"],
          "ESTIMATE_APPROVED": ["WIP_START", "In Progress", "Cancelled"],
          "ESTIMATE_REJECTED": ["Cancelled"],
          "WIP_START": ["In Progress", "Carry Forward"],
          "In Progress": ["Completed", "Carry Forward", "Rework"],
          "Carry Forward": ["In Progress"],
          "Rework": ["In Progress", "Completed"],
          "Completed": ["QC Passed", "QC Failed", "FINAL_REVIEW"],
          "QC Passed": ["FINAL_REVIEW"],
          "QC Failed": ["Rework", "In Progress"],
          "FINAL_REVIEW": ["Awaiting Gate Out", "Invoiced"],
          "Awaiting Gate Out": ["Invoiced", "Closed"],
          "Invoiced": ["Closed"],
          "Cancelled": [],
          "Closed": []
        }
      },
      policy_profile: "StandardRetailPolicy",
      evidence_profile: {
        "WIP_START": [
          { evidence_type: "JobCardSignature", is_mandatory: false, min_quantity: 1, version_requirement: "LATEST", approval_requirement: "NONE" },
          { evidence_type: "VehiclePhoto", is_mandatory: false, min_quantity: 4, version_requirement: "LATEST", approval_requirement: "NONE" }
        ],
        "Completed": [
          { evidence_type: "QC_Checklist", is_mandatory: false, min_quantity: 1, version_requirement: "LATEST", approval_requirement: "NONE" }
        ]
      },
      approval_profile: "StandardRetailApproval",
      notification_profile: "StandardRetailNotification",
      retention_profile: "StandardRetailRetention",
      sla_profile: "StandardRetailSLA"
    });

    // Warranty Default Workflow
    this.registerWorkflow({
      workflow_type: "Warranty",
      strategy_name: "WarrantyStrategy",
      state_machine: {
        workflow_type: "Warranty",
        states: [
          "Waiting", "GATE_IN", "INTAKE_PENDING", "Policy Evaluation",
          "Eligible", "Requires Approval", "Approved", "Rejected",
          "Parts Reserved", "WIP_START", "In Progress", "Completed",
          "QC Passed", "QC Failed", "Ready for Claim", "Claim Submitted",
          "Claim Accepted", "Claim Rejected", "Settlement Received",
          "Closed", "Cancelled"
        ],
        initial_state: "Waiting",
        transitions: {
          "Waiting": ["GATE_IN", "INTAKE_PENDING", "Cancelled", "Policy Evaluation"],
          "GATE_IN": ["INTAKE_PENDING", "Cancelled"],
          "INTAKE_PENDING": ["Policy Evaluation", "Cancelled"],
          "Policy Evaluation": ["Eligible", "Rejected"],
          "Eligible": ["Requires Approval", "Approved"],
          "Requires Approval": ["Approved", "Rejected"],
          "Approved": ["Parts Reserved", "WIP_START"],
          "Parts Reserved": ["WIP_START"],
          "WIP_START": ["In Progress"],
          "In Progress": ["Completed"],
          "Completed": ["QC Passed", "QC Failed"],
          "QC Failed": ["In Progress"],
          "QC Passed": ["Ready for Claim"],
          "Ready for Claim": ["Claim Submitted"],
          "Claim Submitted": ["Claim Accepted", "Claim Rejected"],
          "Claim Accepted": ["Settlement Received"],
          "Claim Rejected": ["Closed"],
          "Settlement Received": ["Closed"],
          "Rejected": ["Cancelled"],
          "Cancelled": [],
          "Closed": []
        }
      },
      policy_profile: "StrictWarrantyPolicy",
      evidence_profile: {
        "WARRANTY_CLAIM_PENDING": [
          { evidence_type: "ECU_Diagnostic_Report", is_mandatory: true, min_quantity: 1, version_requirement: "LATEST", approval_requirement: "NONE" },
          { evidence_type: "DTC_Log", is_mandatory: true, min_quantity: 1, version_requirement: "LATEST", approval_requirement: "NONE" }
        ],
        "WARRANTY_CLAIM_APPROVED": [
          { evidence_type: "Manufacturer_Approval", is_mandatory: true, min_quantity: 1, version_requirement: "LATEST", approval_requirement: "REQUIRED" }
        ]
      },
      approval_profile: "StrictWarrantyApproval",
      notification_profile: "OEM_Notifications",
      retention_profile: "10_Years",
      sla_profile: "StrictWarrantySLA"
    });

    this.registerApprovalProfile({
      profile_id: "StandardRetailApproval",
      strategy: "Sequential",
      auto_escalate: false,
      steps: [
        { step_id: "SERVICE_ADVISOR_REVIEW", allowed_roles: ["Service Advisor", "Service Manager"], is_mandatory: true }
      ]
    });

    this.registerApprovalProfile({
      profile_id: "StrictWarrantyApproval",
      strategy: "Sequential",
      auto_escalate: true,
      steps: [
        { step_id: "WARRANTY_ADMIN_REVIEW", allowed_roles: ["Warranty Admin", "Warranty Manager"], is_mandatory: true },
        { step_id: "SERVICE_MANAGER_REVIEW", allowed_roles: ["Service Manager", "General Manager"], is_mandatory: true }
      ]
    });
    // Warranty Claim Header Lifecycle
    this.registerWorkflow({
      workflow_type: "WarrantyClaim",
      strategy_name: "WarrantyClaimStrategy",
      state_machine: {
        workflow_type: "WarrantyClaim",
        states: [
          "CLAIM_CREATED", "TECHNICAL_VERIFICATION", "PARTS_VALIDATION",
          "LABOUR_VALIDATION", "MANAGER_APPROVAL_PENDING", "OEM_SUBMISSION_READY",
          "OEM_SUBMITTED", "OEM_APPROVED", "OEM_REJECTED", "SETTLEMENT_PENDING", "CLOSED"
        ],
        initial_state: "CLAIM_CREATED",
        transitions: {
          "CLAIM_CREATED": ["TECHNICAL_VERIFICATION"],
          "TECHNICAL_VERIFICATION": ["PARTS_VALIDATION"],
          "PARTS_VALIDATION": ["LABOUR_VALIDATION"],
          "LABOUR_VALIDATION": ["MANAGER_APPROVAL_PENDING"],
          "MANAGER_APPROVAL_PENDING": ["OEM_SUBMISSION_READY", "CLOSED"],
          "OEM_SUBMISSION_READY": ["OEM_SUBMITTED"],
          "OEM_SUBMITTED": ["OEM_APPROVED", "OEM_REJECTED"],
          "OEM_APPROVED": ["SETTLEMENT_PENDING"],
          "OEM_REJECTED": ["CLOSED"],
          "SETTLEMENT_PENDING": ["CLOSED"],
          "CLOSED": []
        }
      },
      policy_profile: "WarrantyClaimPolicy",
      evidence_profile: {},
      approval_profile: "WarrantyClaimApprovalProfile",
      notification_profile: "WarrantyNotification",
      retention_profile: "10_Years",
      sla_profile: "WarrantyClaimSLA"
    });

    this.registerApprovalProfile({
      profile_id: "WarrantyClaimApprovalProfile",
      strategy: "Sequential",
      auto_escalate: true,
      steps: [
        { step_id: "WARRANTY_ADMIN_REVIEW", allowed_roles: ["Warranty Admin", "Service Manager"], is_mandatory: true }
      ]
    });
    // AMC Lifecycle
    this.registerWorkflow({
      workflow_type: "AmcContract",
      strategy_name: "AmcContractStrategy",
      state_machine: {
        workflow_type: "AmcContract",
        states: [
          "DRAFT", "PENDING_APPROVAL", "ACTIVE", "EXPIRED", "CANCELLED", "RENEWED"
        ],
        initial_state: "DRAFT",
        transitions: {
          "DRAFT": ["PENDING_APPROVAL", "ACTIVE"],
          "PENDING_APPROVAL": ["ACTIVE", "CANCELLED"],
          "ACTIVE": ["EXPIRED", "CANCELLED", "RENEWED"],
          "EXPIRED": ["RENEWED"],
          "CANCELLED": [],
          "RENEWED": []
        }
      },
      policy_profile: "AmcPolicy",
      evidence_profile: {},
      approval_profile: "AmcApprovalProfile",
      notification_profile: "AmcNotification",
      retention_profile: "10_Years",
      sla_profile: "AmcSLA"
    });

    this.registerApprovalProfile({
      profile_id: "AmcApprovalProfile",
      strategy: "Sequential",
      auto_escalate: true,
      steps: [
        { step_id: "AMC_MANAGER_REVIEW", allowed_roles: ["AMC Manager", "Service Manager"], is_mandatory: true }
      ]
    });
  }
}

export const workflowRegistry = new WorkflowRegistry();






