/**
 * DWIP Enterprise WOS - State Engine Types & Models
 * Task 1.3 TransitionContext & TransitionResult Models
 */

import { IVos, IVosStateHistory } from '../../../domain/vos/types';

export type VosStateName =
  | 'GATE_IN'
  | 'INSPECTION'
  | 'ESTIMATION'
  | 'APPROVAL_PENDING'
  | 'WORK_IN_PROGRESS'
  | 'QUALITY_CHECK'
  | 'READY_FOR_DELIVERY'
  | 'GATE_OUT'
  | 'CLOSED';

export type VosStateCode =
  | 'STATE_GATE_IN'
  | 'STATE_INSPECTION'
  | 'STATE_ESTIMATION'
  | 'STATE_APPROVAL_PENDING'
  | 'STATE_WORK_IN_PROGRESS'
  | 'STATE_QUALITY_CHECK'
  | 'STATE_READY_FOR_DELIVERY'
  | 'STATE_GATE_OUT'
  | 'STATE_CLOSED';

export interface TransitionContext {
  vosId: string;
  targetState: VosStateName;
  actorId: string;
  actorRole: string;
  reason?: string;
  isGmOverride?: boolean;
  gmOverrideJustification?: string;
  correlationId?: string;
  ruleData?: {
    inspectionCompleted?: boolean;
    estimateApproved?: boolean;
    invoiceGenerated?: boolean;
    paymentSettled?: boolean;
    qualityPassed?: boolean;
    [key: string]: any;
  };
}

export interface TransitionResult {
  success: boolean;
  vosId: string;
  previousState: VosStateName;
  currentState: VosStateName;
  stateCode: VosStateCode;
  version: number;
  timeSpentSeconds: number;
  historyRecord: IVosStateHistory;
  ownershipHandoverTriggered: boolean;
  newOwner?: string;
  newOwnerRole?: string;
  timestamp: string;
}

export interface ITransitionRule {
  name: string;
  evaluate(vos: IVos, context: TransitionContext): Promise<{ passed: boolean; message?: string }>;
}
