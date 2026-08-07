export interface InsuranceClaim {
  claim_id: string;
  policy_id: string;
  job_card_id: string;
  total_claim_amount: number;
  status: string; // DRAFT, SUBMITTED, VALIDATED, APPROVED, REJECTED, SETTLED, CLOSED
  submitted_date?: string;
  approved_date?: string;
  settled_date?: string;
  insurer_reference?: string;
  
  // AI Readiness
  ai_claim_risk?: string;
  ai_fraud_score?: number;
}
