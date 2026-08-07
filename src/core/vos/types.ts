/**
 * DWIP Enterprise - VOS Core Platform Types
 * Re-exports canonical domain models from src/domain/vos/types.ts
 */

export * from '../../domain/vos/types';

// Backward compatibility types for Sprint 1.0 helpers
export type VosState = 
  | 'GATE_IN'
  | 'INTAKE_WIP'
  | 'OPERATIONAL_READY'
  | 'WORKSHOP_WIP'
  | 'QC_PENDING'
  | 'DELIVERY_READY'
  | 'GATE_OUT';

export interface VosSession {
  id: string;
  vin: string;
  registrationNumber: string;
  status: VosState;
  gateInTime: string;
  gateOutTime?: string;
  operationalReadiness: boolean;
  hasOemJobCard: boolean;
  hasApprovedDeviation: boolean;
  currentOwnerId: string;
  currentOwnerRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface VosStateTransition {
  id: string;
  vosId: string;
  fromState: VosState;
  toState: VosState;
  actorId: string;
  actorRole: string;
  reason?: string;
  transitionTime: string;
}

export interface VosEvent {
  id: string;
  vosId: string;
  eventType: string;
  payload: Record<string, any>;
  actorId: string;
  actorRole: string;
  correlationId: string;
  timestamp: string;
}

export interface VosOwnershipTransfer {
  id: string;
  vosId: string;
  fromUserId: string;
  toUserId: string;
  fromRole: string;
  toRole: string;
  reason?: string;
  transferredAt: string;
}

export type DeviationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VosDeviation {
  id: string;
  vosId: string;
  deviationType: 'BYPASS_JOB_CARD' | 'EMERGENCY_DELIVERY' | 'GATE_OUT_OVERRIDE' | 'CUSTOM_WORKFLOW';
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  status: DeviationStatus;
  requestedAt: string;
  resolvedAt?: string;
}

export type TimelineType = 'OPERATIONAL' | 'FINANCIAL_AUDIT';

export interface VosTimelineNode {
  id: string;
  vosId: string;
  timelineType: TimelineType;
  eventType: string;
  title: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface VosConfig {
  id: string;
  configKey: string;
  configValue: string;
  description?: string;
  updatedAt: string;
}
