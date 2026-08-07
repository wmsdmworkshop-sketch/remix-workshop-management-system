export interface InsuranceApprovalRequest {
  request_id: string;
  reference_id: string; // Policy ID or Claim ID
  type: string; // POLICY_APPROVAL, CLAIM_APPROVAL, SETTLEMENT_APPROVAL
  amount?: number;
  status: string; // PENDING, APPROVED, REJECTED
  approver_id?: string;
  timestamp?: string;
}
