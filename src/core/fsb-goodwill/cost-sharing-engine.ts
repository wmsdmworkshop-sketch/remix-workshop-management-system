import { CostSharingResult, GoodwillRequest } from "./goodwill-types";

export class CostSharingEngine {
  
  /**
   * Calculates the financial split between OEM, Dealer, and Customer based on percentages and monetary limits.
   */
  public static calculateSplit(
    requestedAmount: number,
    dealerPct: number,
    dealerLimit: number | undefined,
    oemPct: number,
    oemLimit: number | undefined,
    customerPct: number
  ): CostSharingResult {
    
    // Validate percentages sum to 100 (or at least close for rounding)
    const totalPct = dealerPct + oemPct + customerPct;
    if (Math.abs(totalPct - 100) > 0.01) {
      throw new Error(`Cost sharing percentages must sum to 100. Got: ${totalPct}`);
    }

    let dealerCost = (requestedAmount * dealerPct) / 100;
    let oemCost = (requestedAmount * oemPct) / 100;
    
    // Apply limits if configured
    if (dealerLimit !== undefined && dealerCost > dealerLimit) {
      dealerCost = dealerLimit;
    }
    
    if (oemLimit !== undefined && oemCost > oemLimit) {
      oemCost = oemLimit;
    }

    // Customer bears the remainder of the requested amount
    let customerCost = requestedAmount - (dealerCost + oemCost);

    // Sanity check for negative customer cost (shouldn't happen with valid percentages and limits)
    if (customerCost < 0) customerCost = 0;

    return {
      dealer_cost: Number(dealerCost.toFixed(2)),
      oem_cost: Number(oemCost.toFixed(2)),
      customer_cost: Number(customerCost.toFixed(2)),
      total_approved: requestedAmount
    };
  }
}
