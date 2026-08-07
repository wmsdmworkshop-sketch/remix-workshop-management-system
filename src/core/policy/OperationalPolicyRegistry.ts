/**
 * DWIP Enterprise WOS - OperationalPolicyRegistry
 * Registry of Policy Rule Compositions per Operational Action
 */

import {
  IOperationalPolicyRule,
  RoleAuthorizationPolicyRule,
  VehicleStatusPolicyRule,
  CustomerCategoryPolicyRule,
  WorkshopTypePolicyRule,
  OemConstraintsPolicyRule
} from './OperationalPolicyRule';

export class OperationalPolicyRegistry {
  private static policyMap: Map<string, IOperationalPolicyRule[]> = new Map();

  static {
    OperationalPolicyRegistry.registerDefaults();
  }

  private static registerDefaults(): void {
    // 1. START_WORK policy composition
    OperationalPolicyRegistry.policyMap.set('START_WORK', [
      new VehicleStatusPolicyRule(),
      new RoleAuthorizationPolicyRule(['floor_supervisor', 'technician', 'service_advisor', 'gm', 'admin']),
      new CustomerCategoryPolicyRule(),
      new WorkshopTypePolicyRule()
    ]);

    // 2. APPROVE_ESTIMATE policy composition
    OperationalPolicyRegistry.policyMap.set('APPROVE_ESTIMATE', [
      new VehicleStatusPolicyRule(),
      new RoleAuthorizationPolicyRule(['service_advisor', 'customer', 'insurance_adjuster', 'gm', 'admin']),
      new CustomerCategoryPolicyRule()
    ]);

    // 3. QUALITY_CHECK_PASS policy composition
    OperationalPolicyRegistry.policyMap.set('QUALITY_CHECK_PASS', [
      new VehicleStatusPolicyRule(),
      new RoleAuthorizationPolicyRule(['qc_inspector', 'floor_supervisor', 'gm', 'admin'])
    ]);

    // 4. APPLY_GOODWILL policy composition
    OperationalPolicyRegistry.policyMap.set('APPLY_GOODWILL', [
      new VehicleStatusPolicyRule(),
      new RoleAuthorizationPolicyRule(['general_manager', 'gm', 'admin']),
      new OemConstraintsPolicyRule()
    ]);

    // 5. GATE_OUT policy composition
    OperationalPolicyRegistry.policyMap.set('GATE_OUT', [
      new VehicleStatusPolicyRule(),
      new RoleAuthorizationPolicyRule(['security_agent', 'service_advisor', 'gm', 'admin']),
      new CustomerCategoryPolicyRule()
    ]);
  }

  public static getRules(operation: string): IOperationalPolicyRule[] {
    return OperationalPolicyRegistry.policyMap.get(operation) || [
      new VehicleStatusPolicyRule(),
      new CustomerCategoryPolicyRule()
    ];
  }

  public static registerRules(operation: string, rules: IOperationalPolicyRule[]): void {
    OperationalPolicyRegistry.policyMap.set(operation, rules);
  }
}
