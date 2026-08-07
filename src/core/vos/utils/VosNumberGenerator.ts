/**
 * DWIP Enterprise WOS - VosNumberGenerator
 * Task 1.2 Configurable VOS Numbering Generator
 * Format: {DealerCode}-{BranchCode}-{FinancialYear}-{RunningNumber}
 */

import { VOS_CONSTANTS } from './VosConstants';

export class VosNumberGenerator {
  private static sequenceMap: Map<string, number> = new Map();

  public static generate(
    dealerCode: string,
    branchCode: string,
    financialYear?: string
  ): string {
    const fy = financialYear || VOS_CONSTANTS.DEFAULT_FINANCIAL_YEAR;
    const cleanDealer = (dealerCode || 'DLR').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanBranch = (branchCode || 'BR01').toUpperCase().replace(/[^A-Z0-9]/g, '');

    const key = `${cleanDealer}-${cleanBranch}-${fy}`;
    const nextSeq = (VosNumberGenerator.sequenceMap.get(key) || 0) + 1;
    VosNumberGenerator.sequenceMap.set(key, nextSeq);

    const paddedSeq = String(nextSeq).padStart(6, '0');
    return `${cleanDealer}-${cleanBranch}-${fy}-${paddedSeq}`;
  }

  public static resetSequenceForTest(): void {
    VosNumberGenerator.sequenceMap.clear();
  }
}
