/**
 * DWIP Enterprise WOS - WorkflowCapabilityContext
 * Context model for Workflow Capability Engine Evaluation
 */

import { IVos } from '../../vos/types';
import { WorkflowCapability } from '../WorkflowCapability';

export interface WorkflowCapabilityContext {
  vos: IVos;
  capability: WorkflowCapability;
  actorId?: string;
  actorRole?: string;
  isOverride?: boolean;
  overrideReason?: string;
  ruleData?: Record<string, any>;
  correlationId?: string;
}

export interface CapabilityEvaluationResult {
  hasCapability: boolean;
  capability: WorkflowCapability;
  resolvedProfileCode: string;
  dependenciesSatisfied: boolean;
  inheritedCapabilities: WorkflowCapability[];
  isOverrideApplied: boolean;
  reason?: string;
  evaluatedAt: string;
}
