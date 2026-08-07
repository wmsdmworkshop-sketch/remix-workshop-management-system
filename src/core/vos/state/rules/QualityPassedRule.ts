/**
 * DWIP Enterprise WOS - QualityPassedRule
 * Prerequisite Rule: QC inspection must pass before READY_FOR_DELIVERY
 */

import { ITransitionRule, TransitionContext } from '../types';
import { IVos } from '../../../../domain/vos/types';

export class QualityPassedRule implements ITransitionRule {
  public readonly name = 'QualityPassedRule';

  public async evaluate(vos: IVos, context: TransitionContext): Promise<{ passed: boolean; message?: string }> {
    if (context.ruleData?.qualityPassed === true) {
      return { passed: true };
    }
    return {
      passed: false,
      message: `Prerequisite failed: Workshop Quality Inspection (QC) must be passed before setting READY_FOR_DELIVERY`
    };
  }
}
