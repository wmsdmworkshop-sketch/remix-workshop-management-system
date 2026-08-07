export interface AmcRenewalProposal {
  proposal_id: string;
  original_contract_id: string;
  customer_id: string;
  proposed_plan: string;
  proposed_value: number;
  status: string; // PENDING, APPROVED, REJECTED, LAPSED
  generated_at: string;
  valid_until: string;
}
