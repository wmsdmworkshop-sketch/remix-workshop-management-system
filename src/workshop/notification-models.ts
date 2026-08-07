export interface WorkshopNotification {
  notification_id: string;
  job_card_id: string;
  recipient_id: string;
  recipient_role: string;
  
  type: string; // GATE_ENTRY, ESTIMATE_READY, APPROVAL_PENDING, VEHICLE_READY, DELAY_ALERT
  message: string;
  timestamp: string;
  status: string; // UNREAD, READ
}
