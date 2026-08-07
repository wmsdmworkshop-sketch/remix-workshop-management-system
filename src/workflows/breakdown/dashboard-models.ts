export interface BreakdownDashboardData {
  open_incidents: number;
  active_qrt: number;
  
  average_response_time_mins: number;
  average_eta_mins: number;
  
  sla_percent: number;
  sla_breach_percent: number;
  
  tow_cases: number;
  roadside_repairs: number;
  workshop_transfers: number;
  
  average_resolution_time_hours: number;
  
  technician_performance: Record<string, number>;
  branch_performance: Record<string, number>;
}
