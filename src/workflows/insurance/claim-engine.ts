import { InsuranceClaim } from "./claim-models";
import { InsuranceClaimRules } from "./claim-rules";
import { InsuranceClaimStatus } from "./constants";

export class InsuranceClaimEngine {
  static validate(claim: InsuranceClaim, claimType: string): string {
    if (claim.total_claim_amount <= InsuranceClaimRules.AUTO_APPROVE_BELOW_AMOUNT) {
      return InsuranceClaimStatus.APPROVED;
    }
    
    if (claimType === "THEFT" && InsuranceClaimRules.REQUIRE_POLICE_REPORT_FOR_THEFT) {
      // In reality we'd check if evidence exists
      return InsuranceClaimStatus.VALIDATED; 
    }

    return InsuranceClaimStatus.VALIDATED;
  }
}
