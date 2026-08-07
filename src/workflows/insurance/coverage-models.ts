export interface InsuranceCoverageValidation {
  policy_id: string;
  claim_id?: string;
  status: string; // COVERED, PARTIALLY_COVERED, NOT_COVERED, EXPIRED, EXCLUDED, MANUAL_REVIEW
  covered_amount: number;
  customer_liability: number;
  reason?: string;
}
