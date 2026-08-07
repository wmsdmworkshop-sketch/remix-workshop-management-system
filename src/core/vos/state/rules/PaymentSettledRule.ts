/**
 * DWIP Enterprise WOS - PaymentSettledRule
 * Prerequisite Rule: Payment or credit authorization must be settled before GATE_OUT
 */

import { ITransitionRule, TransitionContext } from '../types';
import { IVos, CommercialType } from '../../../../domain/vos/types';

export class PaymentSettledRule implements ITransitionRule {
  public readonly name = 'PaymentSettledRule';

  public async evaluate(vos: IVos, context: TransitionContext): Promise<{ passed: boolean; message?: string }> {
    // AMC, Warranty, Goodwill do not require immediate cash payment
    if (
      vos.commercialType === CommercialType.WARRANTY ||
      vos.commercialType === CommercialType.AMC ||
      vos.commercialType === CommercialType.GOODWILL
    ) {
      return { passed: true };
    }

    if (context.ruleData?.paymentSettled === true) {
      return { passed: true };
    }

    return {
      passed: false,
      message: `Prerequisite failed: Customer billing payment or authorized credit guarantee must be settled before GATE_OUT`
    };
  }
}
