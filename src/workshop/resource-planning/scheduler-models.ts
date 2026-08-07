export interface ScheduleEvent {
  event_id: string;
  resource_type: string; // BAY, TECHNICIAN, ADVISOR, LIFT, EQUIPMENT
  resource_id: string;
  job_card_id?: string;
  start_time: string;
  end_time: string;
  status: string; // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
}
