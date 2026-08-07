/**
 * DWIP Enterprise WOS - OperationalPolicyContext & PolicyDecision
 * Operational Policy Engine Context & Decision Models
 */

import { IVos } from '../vos/types';

export interface OperationalPolicyContext {
  vos: IVos;
  operation: string;
  userRole: string;
  workshopType?: string;
  customerCategory?: string;
  commercialType?: string;
  vehicleStatus?: string;
  currentState?: string;
  oemConstraints?: Record<string, any>;
  isOverride?: boolean;
  overrideReason?: string;
  ruleData?: Record<string, any>;
  correlationId?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  operation: string;
  reasons: string[];
  evaluatedRules: string[];
  appliedProfile: string;
  isOverrideApplied: boolean;
  evaluatedAt: string;
}
