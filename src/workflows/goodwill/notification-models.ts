export interface GoodwillNotification {
  notification_id: string;
  goodwill_request_id: string;
  type: string; // APPROVAL_PENDING, APPROVAL_GRANTED, APPROVAL_REJECTED, EVIDENCE_REQUIRED, BUDGET_EXCEEDED, CUSTOMER_COMM, SETTLEMENT_COMPLETED
  recipient_role: string;
  recipient_id?: string;
  message: string;
  timestamp: string;
}
