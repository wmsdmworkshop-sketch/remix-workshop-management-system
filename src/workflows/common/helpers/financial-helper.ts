import { FinancialProfile } from "../financial-profile";

export class FinancialHelper {
  static calculateTotalClaimValue(profile: FinancialProfile): number {
    return profile.labour_cost + profile.parts_cost + profile.consumables + profile.tax - profile.discount;
  }

  static calculateRecoveryPercentage(profile: FinancialProfile): number {
    if (profile.claim_value === 0) return 0;
    return (profile.recovered_value / profile.claim_value) * 100;
  }

  static applySettlement(profile: FinancialProfile, amount: number): FinancialProfile {
    return {
      ...profile,
      settlement_value: profile.settlement_value + amount,
      recovered_value: profile.recovered_value + amount,
      recovery_percentage: this.calculateRecoveryPercentage({ ...profile, recovered_value: profile.recovered_value + amount })
    };
  }
}
