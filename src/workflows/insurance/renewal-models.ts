export interface InsuranceRenewal {
  policy_id: string;
  original_expiry_date: string;
  new_expiry_date: string;
  no_claim_bonus_percent: number;
  renewal_premium: number;
  status: string; // PENDING, RENEWED, LAPSED
}
