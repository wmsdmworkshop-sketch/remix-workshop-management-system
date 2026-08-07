export interface AmcNotification {
  notification_id: string;
  contract_id: string;
  customer_id: string;
  notification_type: string; // EXPIRY, SERVICE_REMINDER, OVERDUE, LOW_BALANCE, RENEWAL
  message: string;
  sent_at: string;
  status: string;
}
