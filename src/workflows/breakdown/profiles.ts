import { ProgramConfig } from "../common/program-config";

export const BreakdownProgramProfile: ProgramConfig = {
  program_name: "BREAKDOWN_ROADSIDE_ASSISTANCE",
  version: "1.0.0",
  category: "INTERNAL_REPAIR",
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
    { phase_name: "OPEN", workflow_states: ["OPEN"] },
    { phase_name: "ASSIGNED", workflow_states: ["ASSIGNED"] },
    { phase_name: "IN_TRANSIT", workflow_states: ["IN_TRANSIT"] },
    { phase_name: "ON_SITE", workflow_states: ["ON_SITE"] },
    { phase_name: "AT_WORKSHOP", workflow_states: ["AT_WORKSHOP"] },
    { phase_name: "CLOSED", workflow_states: ["CLOSED"] },
    { phase_name: "CANCELLED", workflow_states: ["CANCELLED"] }
  ]
};
