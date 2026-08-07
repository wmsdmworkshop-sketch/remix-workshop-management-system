import { PremiumCalculation } from "./premium-models";
import { InsurancePremiumRules } from "./premium-rules";

export class InsurancePremiumEngine {
  static calculateNewPremium(vehicleValue: number, isComprehensive: boolean, isHighRisk: boolean, isFleet: boolean): PremiumCalculation {
    let base = (vehicleValue * InsurancePremiumRules.BASE_RATE_PERCENT) / 100;
    if (isComprehensive) {
      base *= InsurancePremiumRules.COMPREHENSIVE_MULTIPLIER;
    }
    
    const riskLoading = isHighRisk ? (base * InsurancePremiumRules.HIGH_RISK_LOADING_PERCENT) / 100 : 0;
    const fleetDiscount = isFleet ? (base * InsurancePremiumRules.FLEET_DISCOUNT_PERCENT) / 100 : 0;
    
    return {
      base_premium: base,
      fleet_discount_amount: fleetDiscount,
      no_claim_bonus_amount: 0,
      risk_loading_amount: riskLoading,
      net_premium: base + riskLoading - fleetDiscount
    };
  }

  static calculateRenewalPremium(basePremium: number, ncbPercent: number): PremiumCalculation {
    const ncb = (basePremium * ncbPercent) / 100;
    return {
      base_premium: basePremium,
      fleet_discount_amount: 0, // Calculated separately if needed
      no_claim_bonus_amount: ncb,
      risk_loading_amount: 0,
      net_premium: basePremium - ncb
    };
  }
}
