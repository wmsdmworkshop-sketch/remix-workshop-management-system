/**
 * DWIP Enterprise WOS - InspectionCompletedRule
 * Prerequisite Rule: Inspection must be completed before ESTIMATION
 */

import { ITransitionRule, TransitionContext } from '../types';
import { IVos } from '../../../../domain/vos/types';

export class InspectionCompletedRule implements ITransitionRule {
  public readonly name = 'InspectionCompletedRule';

  public async evaluate(vos: IVos, context: TransitionContext): Promise<{ passed: boolean; message?: string }> {
    if (context.ruleData?.inspectionCompleted === true) {
      return { passed: true };
    }
    // If context doesn't explicitly mark passed, check if VOS already passed inspection
    if (vos.currentState !== 'GATE_IN') {
      return { passed: true };
    }
    return {
      passed: false,
      message: `Prerequisite failed: Vehicle intake inspection must be completed before moving to ESTIMATION`
    };
  }
}
