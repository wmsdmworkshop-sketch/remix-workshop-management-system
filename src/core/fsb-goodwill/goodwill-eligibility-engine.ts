import { GoodwillDecision, GoodwillRecommendationMetadata } from "./goodwill-types";

export class GoodwillEligibilityEngine {
  
  /**
   * Evaluates Goodwill feasibility and returns structured metadata recommendation.
   * In a real scenario, this would check DB for vehicle age, mileage, service history, loyalty, etc.
   */
  public static evaluateRequest(
    vin: string,
    requestedAmount: number,
    category: string
  ): GoodwillRecommendationMetadata {
    
    const factors: string[] = [];
    let decision: GoodwillDecision = "REJECTED";
    let confidence = 0;
    let oem = 0;
    let dealer = 0;
    let customer = 100;

    // Simulated Business Rules
    if (category === "OEM") {
      factors.push("Category is OEM Goodwill");
      if (requestedAmount > 5000) {
        decision = "MANAGEMENT_REVIEW_REQUIRED";
        factors.push("High Value Request");
        confidence = 0.5;
        oem = 50; dealer = 25; customer = 25;
      } else {
        decision = "APPROVED";
        factors.push("Standard OEM Coverage");
        confidence = 0.9;
        oem = 100; dealer = 0; customer = 0;
      }
    } else if (category === "DEALER") {
      factors.push("Category is Dealer Goodwill");
      decision = "PARTIAL_APPROVAL";
      factors.push("Customer Loyalty Program");
      confidence = 0.8;
      oem = 0; dealer = 50; customer = 50;
    } else {
      factors.push("Category is Policy Exception");
      decision = "MANAGEMENT_REVIEW_REQUIRED";
      confidence = 0.4;
      oem = 30; dealer = 30; customer = 40;
    }

    return {
      decision,
      confidence_score: confidence,
      factors,
      recommended_oem_share: oem,
      recommended_dealer_share: dealer,
      recommended_customer_share: customer
    };
  }
}
