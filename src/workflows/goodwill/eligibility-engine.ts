import { GoodwillRequest } from "./goodwill-models";
import { GoodwillEligibilityStatus } from "./constants";

export class GoodwillEligibilityEngine {
  static evaluateEligibility(request: GoodwillRequest, vehicleData: any, customerData: any): string {
    // In a real system, this evaluates all the configuration-driven parameters
    const ageMonths = vehicleData?.age_months || 0;
    const mileage = vehicleData?.mileage || 0;
    
    // Example basic rule: Vehicles over 120 months or 200,000km are automatically rejected for standard goodwill
    if (ageMonths > 120 || mileage > 200000) {
      if (request.reason_code !== "CUSTOMER_RETENTION") {
        return GoodwillEligibilityStatus.REJECTED;
      }
    }
    
    // Example: Repeat failure requires manual review
    if (request.reason_code === "REPEAT_FAILURE") {
      return GoodwillEligibilityStatus.MANUAL_REVIEW;
    }
    
    // Example: Conditionally eligible based on lack of warranty but good service history
    if (!vehicleData?.has_warranty && customerData?.loyalty_score > 80) {
      return GoodwillEligibilityStatus.CONDITIONALLY_ELIGIBLE;
    }
    
    return GoodwillEligibilityStatus.ELIGIBLE;
  }
}
