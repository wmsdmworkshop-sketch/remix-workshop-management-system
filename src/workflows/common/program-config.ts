import { ProgramCategory } from "./workflow-types";
import { ProgramCapabilities } from "./program-definition";

export interface LifecyclePhaseDefinition {
  phase_name: string;
  workflow_states: string[];
}

export interface ProgramConfig {
  program_name: string;
  version: string;
  category: ProgramCategory;
  
  capabilities: ProgramCapabilities;
  
  lifecycle_definition: LifecyclePhaseDefinition[];
}
