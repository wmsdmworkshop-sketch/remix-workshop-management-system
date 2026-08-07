/**
 * DWIP Enterprise WOS - VosStateTransitionPolicy
 * Evaluates Role Authorizations, Prerequisite Rules & GM Override
 */

import { TransitionContext, ITransitionRule, VosStateName } from './types';
import { IVos } from '../../../domain/vos/types';
import { VosStateException } from './VosStateException';
import {
  InspectionCompletedRule,
  EstimateApprovedRule,
  QualityPassedRule,
  InvoiceGeneratedRule,
  PaymentSettledRule
} from './rules';

export class VosStateTransitionPolicy {
  private rulesMap: Map<VosStateName, ITransitionRule[]> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  private registerDefaultRules(): void {
    this.rulesMap.set('ESTIMATION', [new InspectionCompletedRule()]);
    this.rulesMap.set('WORK_IN_PROGRESS', [new EstimateApprovedRule()]);
    this.rulesMap.set('READY_FOR_DELIVERY', [new QualityPassedRule()]);
    this.rulesMap.set('GATE_OUT', [new InvoiceGeneratedRule(), new PaymentSettledRule()]);
  }

  /**
   * Validate user role permissions for normal state transition
   */
  public validateRolePermission(targetState: VosStateName, actorRole: string): void {
    const role = (actorRole || '').toLowerCase();

    // System and admins have unrestricted role permissions
    if (role === 'system' || role === 'admin' || role === 'general_manager' || role === 'gm') {
      return;
    }

    switch (targetState) {
      case 'INSPECTION':
      case 'ESTIMATION':
      case 'APPROVAL_PENDING':
        if (!['service_advisor', 'technician', 'security_agent', 'floor_supervisor'].includes(role)) {
          throw new VosStateException(
            `Role '${actorRole}' is not authorized to transition state to ${targetState}`,
            'VOS_UNAUTHORIZED_ROLE'
          );
        }
        break;
      case 'WORK_IN_PROGRESS':
        if (!['service_advisor', 'floor_supervisor', 'technician'].includes(role)) {
          throw new VosStateException(
            `Role '${actorRole}' is not authorized to transition state to ${targetState}`,
            'VOS_UNAUTHORIZED_ROLE'
          );
        }
        break;
      case 'QUALITY_CHECK':
        if (!['floor_supervisor', 'qc_inspector', 'service_advisor'].includes(role)) {
          throw new VosStateException(
            `Role '${actorRole}' is not authorized to transition state to ${targetState}`,
            'VOS_UNAUTHORIZED_ROLE'
          );
        }
        break;
      case 'READY_FOR_DELIVERY':
        if (!['qc_inspector', 'service_advisor', 'floor_supervisor'].includes(role)) {
          throw new VosStateException(
            `Role '${actorRole}' is not authorized to transition state to ${targetState}`,
            'VOS_UNAUTHORIZED_ROLE'
          );
        }
        break;
      case 'GATE_OUT':
      case 'CLOSED':
        if (!['security_agent', 'service_advisor', 'cashier'].includes(role)) {
          throw new VosStateException(
            `Role '${actorRole}' is not authorized to transition state to ${targetState}`,
            'VOS_UNAUTHORIZED_ROLE'
          );
        }
        break;
    }
  }

  /**
   * Evaluate GM Override authorization and justification
   */
  public evaluateGmOverride(context: TransitionContext): void {
    const role = (context.actorRole || '').toLowerCase();
    const isGmRole = ['general_manager', 'gm', 'workshop_head', 'admin', 'system'].includes(role);

    if (!isGmRole) {
      throw new VosStateException(
        `Role '${context.actorRole}' is not authorized to perform GM Override. Only General Manager or Admin roles can override state policies.`,
        'VOS_UNAUTHORIZED_GM_OVERRIDE'
      );
    }

    const justification = context.gmOverrideJustification || context.reason;
    if (!justification || justification.trim().length === 0) {
      throw new VosStateException(
        `GM Override requires a mandatory audit justification reason. None provided.`,
        'VOS_GM_OVERRIDE_REASON_REQUIRED'
      );
    }
  }

  /**
   * Evaluate prerequisite rules for target state
   */
  public async evaluatePrerequisites(vos: IVos, context: TransitionContext): Promise<void> {
    const rules = this.rulesMap.get(context.targetState) || [];
    for (const rule of rules) {
      const res = await rule.evaluate(vos, context);
      if (!res.passed) {
        throw new VosStateException(
          res.message || `Prerequisite rule ${rule.name} failed for transition to ${context.targetState}`,
          'VOS_STATE_PREREQUISITE_FAILED'
        );
      }
    }
  }
}

export const vosStateTransitionPolicy = new VosStateTransitionPolicy();
