import { ProgramConfig } from "../common/program-config";

export const FsbProgramProfile: ProgramConfig = {
  program_name: "FSB_CAMPAIGN",
  version: "1.0.0",
  category: "CAMPAIGN",
  capabilities: {
    supports_financial: true,
    supports_oem: true,
    supports_recovery: true,
    supports_settlement: true,
    supports_sla: true,
    supports_evidence: true,
    supports_approval: true
  },
  lifecycle_definition: [
    { phase_name: "DRAFT", workflow_states: ["DRAFT"] },
    { phase_name: "ACTIVE", workflow_states: ["ACTIVE"] },
    { phase_name: "SUSPENDED", workflow_states: ["SUSPENDED"] },
    { phase_name: "CLOSED", workflow_states: ["CLOSED"] },
    { phase_name: "CANCELLED", workflow_states: ["CANCELLED"] }
  ]
};
