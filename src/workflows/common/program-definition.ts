import { LifecyclePhase, ProgramCategory, ProgramStatus } from "./workflow-types";
import { ProgramMetadata } from "./program-metadata";
import { FinancialProfile } from "./financial-profile";
import { ProgramTimeline } from "./program-timeline";

export interface ProgramCapabilities {
  supports_financial: boolean;
  supports_oem: boolean;
  supports_recovery: boolean;
  supports_settlement: boolean;
  supports_sla: boolean;
  supports_evidence: boolean;
  supports_approval: boolean;
}

export interface ExternalReference {
  type: string;
  id: string;
  url?: string;
}

export interface ProgramDefinition {
  program_id: string;
  program_name: string;
  program_type: string;
  program_category: ProgramCategory;
  business_case_id: string;
  
  current_workflow_state: string;
  current_lifecycle_phase: LifecyclePhase;
  
  policy_profile: string;
  evidence_profile: string;
  approval_profile: string;
  
  financial_profile: FinancialProfile;
  timeline: ProgramTimeline;
  metadata: ProgramMetadata;
  
  priority: string;
  status: ProgramStatus;
  history: any[];
  external_references: ExternalReference[];
  capabilities: ProgramCapabilities;
  owner: string;
}
