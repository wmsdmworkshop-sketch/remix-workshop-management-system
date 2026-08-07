export interface FsbNotification {
  notification_id: string;
  campaign_id: string;
  vin?: string;
  type: string; // CAMPAIGN_RELEASED, VEHICLE_ELIGIBLE, VEHICLE_PENDING, CAMPAIGN_EXPIRING, CAMPAIGN_CLOSED, CLAIM_APPROVED, CLAIM_REJECTED
  recipient_role: string;
  recipient_id?: string;
  message: string;
  timestamp: string;
}
