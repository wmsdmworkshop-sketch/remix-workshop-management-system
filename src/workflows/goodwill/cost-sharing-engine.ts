import { GoodwillCostSharingMatrix, CostSharingRule } from "./cost-sharing-matrix";

export class GoodwillCostSharingEngine {
  static getCostSharingRule(category: string): CostSharingRule | undefined {
    return GoodwillCostSharingMatrix.find(rule => rule.category === category);
  }

  static calculateContribution(totalCost: number, rule: CostSharingRule) {
    return {
      customer_contribution: (totalCost * rule.customer_percent) / 100,
      dealer_contribution: (totalCost * rule.dealer_percent) / 100,
      oem_contribution: (totalCost * rule.oem_percent) / 100,
      vendor_contribution: (totalCost * rule.vendor_percent) / 100,
      insurance_contribution: (totalCost * rule.insurance_percent) / 100
    };
  }
}
