import { InsurancePolicy } from "./policy-models";
import { InsuranceRenewal } from "./renewal-models";
import { InsuranceRenewalRules } from "./renewal-rules";
import { InsurancePremiumEngine } from "./premium-engine";

export class InsuranceRenewalEngine {
  static evaluateRenewal(policy: InsurancePolicy, previousClaimsCount: number): InsuranceRenewal {
    const originalExpiry = new Date(policy.expiry_date);
    const newExpiry = new Date(originalExpiry);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    
    let ncb = 0;
    if (previousClaimsCount === 0) {
      ncb = InsuranceRenewalRules.NO_CLAIM_BONUS_YEARLY_INCREMENT;
      if (ncb > InsuranceRenewalRules.MAX_NO_CLAIM_BONUS_PERCENT) {
        ncb = InsuranceRenewalRules.MAX_NO_CLAIM_BONUS_PERCENT;
      }
    }
    
    const premium = InsurancePremiumEngine.calculateRenewalPremium(policy.premium_amount, ncb);

    return {
      policy_id: policy.policy_number,
      original_expiry_date: policy.expiry_date,
      new_expiry_date: newExpiry.toISOString(),
      no_claim_bonus_percent: ncb,
      renewal_premium: premium.net_premium,
      status: "PENDING"
    };
  }
}
