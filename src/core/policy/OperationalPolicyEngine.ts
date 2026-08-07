/**
 * DWIP Enterprise WOS - OperationalPolicyEngine
 * Primary Operational Policy Decision Engine Service Facade
 */

import { OperationalPolicyContext, PolicyDecision } from './OperationalPolicyContext';
import { OperationalPolicyEvaluator, operationalPolicyEvaluator } from './OperationalPolicyEvaluator';
import { StructuredLogger } from '../vos/utils/StructuredLogger';

export class OperationalPolicyEngine {
  constructor(private evaluator: OperationalPolicyEvaluator = operationalPolicyEvaluator) {}

  /**
   * Primary Policy Decision Entry Point
   * Business modules MUST request policy decisions ONLY through this method.
   */
  public async evaluate(context: OperationalPolicyContext): Promise<PolicyDecision> {
    const startTime = Date.now();
    const decision = await this.evaluator.evaluate(context);

    StructuredLogger.info(
      `Evaluated policy for operation '${context.operation}' on VOS ${context.vos.id}: ${decision.allowed ? 'PERMITTED' : 'DENIED'}`,
      {
        correlationId: context.correlationId,
        vosId: context.vos.id,
        component: 'OperationalPolicyEngine',
        operation: context.operation,
        durationMs: Date.now() - startTime,
        result: decision.allowed ? 'SUCCESS' : 'WARNING',
        reasons: decision.reasons,
        appliedProfile: decision.appliedProfile,
        isOverride: decision.isOverrideApplied
      }
    );

    return decision;
  }
}

export const operationalPolicyEngine = new OperationalPolicyEngine();
