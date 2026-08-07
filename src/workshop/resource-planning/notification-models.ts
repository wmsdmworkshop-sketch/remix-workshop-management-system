export interface WrpNotification {
  notification_id: string;
  type: string; // CAPACITY_BREACH, BOTTLENECK_DETECTED, SHIFT_UNBALANCED
  message: string;
  workshop_id: string;
  timestamp: string;
}
