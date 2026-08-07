import { ProgramConfig } from "../common/program-config";

export const AmcProgramProfile: ProgramConfig = {
  program_name: "AMC",
  version: "1.0.0",
  category: "AMC",
  capabilities: {
    supports_financial: true,
    supports_oem: false,
    supports_recovery: false,
    supports_settlement: true,
    supports_sla: true,
    supports_evidence: true,
    supports_approval: true
  },
  lifecycle_definition: [
    { phase_name: "DRAFT", workflow_states: ["DRAFT"] },
    { phase_name: "ACTIVE", workflow_states: ["ACTIVE"] },
    { phase_name: "EXPIRED", workflow_states: ["EXPIRED"] }
  ]
};
