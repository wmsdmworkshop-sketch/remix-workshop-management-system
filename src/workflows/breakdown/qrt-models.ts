export interface BreakdownQrt {
  qrt_id: string;
  team_name: string;
  engineer_name: string;
  technician_name?: string;
  vehicle_registration: string;
  
  dispatch_time?: string;
  reached_time?: string;
  work_started_time?: string;
  work_completed_time?: string;
  
  current_status: string; // AVAILABLE, DISPATCHED, EN_ROUTE, ON_SITE, RETURNING, OFF_DUTY
  
  ai_technician_recommendation?: string;
}
