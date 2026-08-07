/**
 * DWIP Enterprise WOS - WorkflowContext
 * Execution Context holding VOS Session, Active Workflow Profile & Capabilities
 */

import { IVos } from '../vos/types';
import { IWorkflowProfile } from './WorkflowProfile';
import { WorkflowCapability } from './WorkflowCapability';

export interface WorkflowContext {
  vos: IVos;
  profile: IWorkflowProfile;
  activeCapabilities: WorkflowCapability[];
  actorId: string;
  actorRole: string;
  ruleData?: Record<string, any>;
  correlationId?: string;
}
