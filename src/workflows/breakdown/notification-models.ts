export interface BreakdownNotification {
  notification_id: string;
  incident_id: string;
  type: string; // INCIDENT_CREATED, QRT_ASSIGNED, QRT_REACHED, ETA_UPDATED, TOW_ASSIGNED, VEHICLE_RECOVERED, WORKSHOP_ARRIVED, JOB_CARD_CREATED, REPAIR_COMPLETED, VEHICLE_DELIVERED, CASE_CLOSED
  recipient_role: string;
  message: string;
  timestamp: string;
}
