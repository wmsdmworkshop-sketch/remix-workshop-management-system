/**
 * DWIP Enterprise WOS - OperationalPolicyRule
 * Policy Rule Composition Interfaces & Standard Rule Implementations
 */

import { OperationalPolicyContext } from './OperationalPolicyContext';

export interface RuleEvaluationResult {
  passed: boolean;
  reason?: string;
}

export interface IOperationalPolicyRule {
  name: string;
  priority: number; // Higher number = higher priority
  evaluate(context: OperationalPolicyContext): Promise<RuleEvaluationResult> | RuleEvaluationResult;
}

// 1. Role Authorization Rule
export class RoleAuthorizationPolicyRule implements IOperationalPolicyRule {
  public readonly name = 'RoleAuthorizationPolicyRule';
  public readonly priority = 100;

  constructor(private permittedRoles: string[]) {}

  public evaluate(context: OperationalPolicyContext): RuleEvaluationResult {
    const role = (context.userRole || '').toLowerCase();
    const isPermitted = this.permittedRoles.map(r => r.toLowerCase()).includes(role);
    if (!isPermitted) {
      return {
        passed: false,
        reason: `Role '${context.userRole}' is not authorized to execute operation '${context.operation}'. Permitted roles: ${this.permittedRoles.join(', ')}`
      };
    }
    return { passed: true };
  }
}

// 2. Vehicle Status Rule
export class VehicleStatusPolicyRule implements IOperationalPolicyRule {
  public readonly name = 'VehicleStatusPolicyRule';
  public readonly priority = 90;

  public evaluate(context: OperationalPolicyContext): RuleEvaluationResult {
    if (context.vos.isClosed) {
      return {
        passed: false,
        reason: `Operation '${context.operation}' rejected: VOS session ${context.vos.id} is CLOSED.`
      };
    }
    return { passed: true };
  }
}

// 3. Customer Category Rule
export class CustomerCategoryPolicyRule implements IOperationalPolicyRule {
  public readonly name = 'CustomerCategoryPolicyRule';
  public readonly priority = 80;

  public evaluate(context: OperationalPolicyContext): RuleEvaluationResult {
    if (context.customerCategory === 'BLACKLISTED') {
      return {
        passed: false,
        reason: `Operation '${context.operation}' rejected: Customer is flagged as BLACKLISTED.`
      };
    }
    return { passed: true };
  }
}

// 4. Workshop Type Rule
export class WorkshopTypePolicyRule implements IOperationalPolicyRule {
  public readonly name = 'WorkshopTypePolicyRule';
  public readonly priority = 70;

  public evaluate(context: OperationalPolicyContext): RuleEvaluationResult {
    if (context.workshopType === 'EXPRESS_BAY' && context.operation === 'HEAVY_ENGINE_OVERHAUL') {
      return {
        passed: false,
        reason: `Operation 'HEAVY_ENGINE_OVERHAUL' cannot be executed in workshop type 'EXPRESS_BAY'.`
      };
    }
    return { passed: true };
  }
}

// 5. OEM Constraints Rule
export class OemConstraintsPolicyRule implements IOperationalPolicyRule {
  public readonly name = 'OemConstraintsPolicyRule';
  public readonly priority = 60;

  public evaluate(context: OperationalPolicyContext): RuleEvaluationResult {
    if (context.oemConstraints?.claimHold === true) {
      return {
        passed: false,
        reason: `Operation '${context.operation}' rejected: OEM warranty claim is currently placed on hold by OEM portal.`
      };
    }
    return { passed: true };
  }
}
