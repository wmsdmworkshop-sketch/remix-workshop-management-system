import { GoodwillRequest } from "./goodwill-models";

export class GoodwillCommercialScoreEngine {
  static calculateScore(request: GoodwillRequest, customerData: any, vehicleData: any): any {
    let score = 50; // Base score
    
    // Reward loyalty
    if (customerData?.lifetime_revenue > 10000) score += 20;
    if (vehicleData?.has_amc) score += 10;
    if (customerData?.fleet_size > 5) score += 10;
    
    // Penalize repeats
    if (vehicleData?.previous_goodwill_count > 1) score -= 15;

    return {
      commercial_score: score,
      risk_level: score < 40 ? "HIGH" : (score <= 70 ? "MEDIUM" : "LOW"),
      recommended_approval_level: score > 80 ? "DEALER_PRINCIPAL" : "OEM"
    };
  }
}
