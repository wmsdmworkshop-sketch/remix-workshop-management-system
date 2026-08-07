export interface InsuranceNotification {
  notification_id: string;
  reference_id: string;
  type: string; // POLICY_EXPIRY, CLAIM_SUBMITTED, CLAIM_APPROVED, CLAIM_REJECTED, SETTLEMENT_COMPLETED, RENEWAL_DUE, FLEET_CONTRACT_EXPIRY, COVERAGE_EXHAUSTED
  recipient_role: string;
  message: string;
  timestamp: string;
}
