export interface GoodwillApprovalRequest {
  request_id: string;
  goodwill_request_id: string;
  required_level: string;
  amount: number;
  status: string; // PENDING, APPROVED, REJECTED
  approver_id?: string;
  timestamp?: string;
  notes?: string;
}
