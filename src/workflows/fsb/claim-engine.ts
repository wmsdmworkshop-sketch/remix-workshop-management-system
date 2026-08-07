import { FsbClaimRules } from "./claim-rules";

export class FsbClaimEngine {
  static validateClaim(labourHours: number, hasValidVin: boolean): boolean {
    if (FsbClaimRules.REQUIRE_VIN_VALIDATION && !hasValidVin) {
      return false;
    }
    
    if (labourHours > FsbClaimRules.MAX_LABOUR_HOURS_OVERRIDE) {
      return false; // requires manual override
    }
    
    return true;
  }
}
