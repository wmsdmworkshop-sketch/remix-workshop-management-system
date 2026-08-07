import { ProgramConfig } from "../common/program-config";

export const InsuranceProgramProfile: ProgramConfig = {
  program_name: "INSURANCE",
  version: "1.0.0",
  category: "INSURANCE",
  capabilities: {
    supports_financial: true,
    supports_oem: false,
    supports_recovery: true,
    supports_settlement: true,
    supports_sla: true,
    supports_evidence: true,
    supports_approval: true
  },
  lifecycle_definition: [
    { phase_name: "ACTIVE", workflow_states: ["ACTIVE"] },
    { phase_name: "EXPIRED", workflow_states: ["EXPIRED"] },
    { phase_name: "CANCELLED", workflow_states: ["CANCELLED"] }
  ]
};

export const FleetContractProgramProfile: ProgramConfig = {
  program_name: "FLEET_CONTRACT",
  version: "1.0.0",
  category: "FLEET_CONTRACT",
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
    { phase_name: "ACTIVE", workflow_states: ["ACTIVE"] },
    { phase_name: "EXPIRED", workflow_states: ["EXPIRED"] },
    { phase_name: "SUSPENDED", workflow_states: ["SUSPENDED"] }
  ]
};
