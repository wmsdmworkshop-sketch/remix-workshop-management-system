export interface WrpDashboardData {
  workshop_capacity_percent: number;
  bay_occupancy_percent: number;
  technician_utilization_percent: number;
  advisor_utilization_percent: number;
  equipment_availability_percent: number;
  
  workshop_load_percent: number;
  branch_load_percent: number;
  
  forecast_accuracy_percent: number;
  average_planning_efficiency_percent: number;
  
  daily_available_hours: number;
}
