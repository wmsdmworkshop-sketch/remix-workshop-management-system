import { InsurancePolicy } from "./policy-models";
import { CoverageStatus } from "./constants";
import { InsuranceCoverageMatrix } from "./coverage-matrix";

export class InsuranceCoverageValidationEngine {
  static validate(policy: InsurancePolicy, claimType: string): string {
    const now = new Date();
    const expiry = new Date(policy.expiry_date);
    
    if (now > expiry) {
      return CoverageStatus.EXPIRED;
    }

    const coverageRules = (InsuranceCoverageMatrix as any)[policy.policy_type];
    if (!coverageRules) {
      return CoverageStatus.MANUAL_REVIEW;
    }

    if (claimType === "ACCIDENT" && !coverageRules.covers_accidents) return CoverageStatus.NOT_COVERED;
    if (claimType === "NATURAL_DISASTER" && !coverageRules.covers_natural_disasters) return CoverageStatus.NOT_COVERED;
    if (claimType === "THEFT" && !coverageRules.covers_theft) return CoverageStatus.NOT_COVERED;
    
    if (coverageRules.deductible_percent > 0) {
      return CoverageStatus.PARTIALLY_COVERED;
    }
    
    return CoverageStatus.COVERED;
  }
}
