/**
 * DWIP Enterprise WOS - OperationalPolicyEvaluator
 * Evaluates Composed Operational Policy Rules with Priority Order & Override Handling
 */

import { OperationalPolicyContext, PolicyDecision } from './OperationalPolicyContext';
import { OperationalPolicyRegistry } from './OperationalPolicyRegistry';
import { WorkflowResolver } from '../workflow/WorkflowResolver';
import { OperationalPolicyException } from './OperationalPolicyException';

export class OperationalPolicyEvaluator {
  public async evaluate(context: OperationalPolicyContext): Promise<PolicyDecision> {
    const { vos, operation, isOverride, overrideReason, userRole } = context;

    // 1. Resolve Active Workflow Profile
    const activeProfile = WorkflowResolver.resolveForVos(vos);

    // 2. GM Override Path
    if (isOverride) {
      const role = (userRole || '').toLowerCase();
      const isAuthorized = ['general_manager', 'gm', 'admin', 'system'].includes(role);

      if (!isAuthorized) {
        throw new OperationalPolicyException(
          `Role '${userRole}' is not authorized to execute operational policy overrides.`,
          'UNAUTHORIZED_POLICY_OVERRIDE'
        );
      }

      if (!overrideReason || overrideReason.trim().length === 0) {
        throw new OperationalPolicyException(
          `Policy override requires a mandatory justification reason.`,
          'POLICY_OVERRIDE_REASON_REQUIRED'
        );
      }

      return {
        allowed: true,
        operation,
        reasons: [`Policy override granted by GM: ${overrideReason}`],
        evaluatedRules: ['GM_OVERRIDE_AUTHORIZATION'],
        appliedProfile: activeProfile.code,
        isOverrideApplied: true,
        evaluatedAt: new Date().toISOString()
      };
    }

    // 3. Fetch Composed Policy Rules
    const rules = OperationalPolicyRegistry.getRules(operation);

    // 4. Sort Rules by Priority (Descending)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    const reasons: string[] = [];
    const evaluatedRuleNames: string[] = [];
    let isAllowed = true;

    // 5. Evaluate Rules in Priority Chain
    for (const rule of sortedRules) {
      evaluatedRuleNames.push(rule.name);
      const res = await rule.evaluate(context);

      if (!res.passed) {
        isAllowed = false;
        if (res.reason) {
          reasons.push(res.reason);
        }
      }
    }

    return {
      allowed: isAllowed,
      operation,
      reasons,
      evaluatedRules: evaluatedRuleNames,
      appliedProfile: activeProfile.code,
      isOverrideApplied: false,
      evaluatedAt: new Date().toISOString()
    };
  }
}

export const operationalPolicyEvaluator = new OperationalPolicyEvaluator();
