import { GoodwillRequest } from "./goodwill-models";
import { RiskLevels } from "./constants";

export class GoodwillRepeatDetectionEngine {
  static detectRepeatRisk(currentRequest: GoodwillRequest, historicalRequests: GoodwillRequest[]): string {
    const sameVin = historicalRequests.filter(r => r.vehicle_vin === currentRequest.vehicle_vin);
    if (sameVin.length === 0) return RiskLevels.LOW;
    
    const sameComplaint = sameVin.filter(r => r.complaint === currentRequest.complaint);
    if (sameComplaint.length > 2) return RiskLevels.POTENTIAL_ABUSE;
    if (sameComplaint.length > 0) return RiskLevels.HIGH;

    return RiskLevels.MEDIUM;
  }
}
