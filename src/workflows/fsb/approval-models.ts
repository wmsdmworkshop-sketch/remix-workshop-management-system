export interface FsbApprovalRequest {
  request_id: string;
  campaign_id: string;
  claim_id?: string;
  type: string; // CAMPAIGN_APPROVAL, CLAIM_APPROVAL
  status: string; // PENDING, APPROVED, REJECTED
  approver_id?: string;
  timestamp?: string;
  notes?: string;
}
