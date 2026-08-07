/**
 * DWIP Enterprise WOS - InvoiceGeneratedRule
 * Prerequisite Rule: Final billing invoice must be generated before GATE_OUT
 */

import { ITransitionRule, TransitionContext } from '../types';
import { IVos } from '../../../../domain/vos/types';

export class InvoiceGeneratedRule implements ITransitionRule {
  public readonly name = 'InvoiceGeneratedRule';

  public async evaluate(vos: IVos, context: TransitionContext): Promise<{ passed: boolean; message?: string }> {
    if (context.ruleData?.invoiceGenerated === true) {
      return { passed: true };
    }
    return {
      passed: false,
      message: `Prerequisite failed: Final proforma or tax invoice must be generated prior to GATE_OUT`
    };
  }
}
