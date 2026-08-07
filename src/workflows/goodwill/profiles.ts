import { ProgramConfig } from "../common/program-config";

export const GoodwillProgramProfile: ProgramConfig = {
  program_name: "Goodwill",
  version: "1.0.0",
  category: "GOODWILL",
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
    { phase_name: "PENDING_APPROVAL", workflow_states: ["PENDING_APPROVAL"] },
    { phase_name: "APPROVED", workflow_states: ["APPROVED"] },
    { phase_name: "REJECTED", workflow_states: ["REJECTED"] },
    { phase_name: "CLOSED", workflow_states: ["CLOSED"] }
  ]
};
