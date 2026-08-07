/**
 * DWIP Enterprise WOS - EstimateApprovedRule
 * Prerequisite Rule: Cost estimate must be approved before WORK_IN_PROGRESS
 */

import { ITransitionRule, TransitionContext } from '../types';
import { IVos } from '../../../../domain/vos/types';
import { workflowCapabilityEngine } from '../../../workflow/capabilities/WorkflowCapabilityEngine';
import { WorkflowCapability } from '../../../workflow/WorkflowCapability';

export class EstimateApprovedRule implements ITransitionRule {
  public readonly name = 'EstimateApprovedRule';

  public async evaluate(vos: IVos, context: TransitionContext): Promise<{ passed: boolean; message?: string }> {
    const skipsEstimate =
      workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.SKIP_ESTIMATE) ||
      workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.FAST_TRACK) ||
      workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.INTERNAL_DIRECT_WORK);

    if (skipsEstimate) {
      return { passed: true };
    }

    if (context.ruleData?.estimateApproved === true) {
      return { passed: true };
    }
    return {
      passed: false,
      message: `Prerequisite failed: Customer or insurance cost estimate approval is required before starting WORK_IN_PROGRESS`
    };
  }
}
