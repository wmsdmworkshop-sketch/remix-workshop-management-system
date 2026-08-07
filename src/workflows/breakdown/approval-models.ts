export interface BreakdownApproval {
  request_id: string;
  incident_id: string;
  type: string; // TOW_APPROVAL, OUT_OF_POLICY_APPROVAL, GOODWILL_APPROVAL
  status: string; // PENDING, APPROVED, REJECTED
  approver_id?: string;
  timestamp?: string;
}
