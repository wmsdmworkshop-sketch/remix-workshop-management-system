/**
 * DWIP Enterprise WOS - WorkflowProfile Interface
 * Task 2.1 Configurable Workflow Profile Model
 */

import { VosStateName } from '../vos/state/types';
import { WorkflowCapability } from './WorkflowCapability';

export interface OwnershipRule {
  state: VosStateName;
  defaultRole: string;
}

export interface IWorkflowProfile {
  code: string;
  name: string;
  description: string;
  permittedStates: VosStateName[];
  transitionGraph: Record<VosStateName, VosStateName[]>;
  capabilities: WorkflowCapability[];
  prerequisitesMap?: Record<VosStateName, string[]>;
  requiredMilestones?: string[];
  ownershipRules?: OwnershipRule[];
}
