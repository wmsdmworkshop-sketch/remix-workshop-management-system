export interface WorkshopDashboardData {
  vehicles_received: number;
  vehicles_delivered: number;
  open_job_cards: number;
  delayed_job_cards: number;
  
  bay_utilization_percent: number;
  technician_productivity_percent: number;
  
  labour_revenue: number;
  parts_revenue: number;
  
  estimate_approval_percent: number;
  first_time_fix_percent: number;
  
  qc_pass_percent: number;
  road_test_pass_percent: number;
  
  wash_pending: number;
  delivery_pending: number;
  
  customer_feedback_percent: number;
  nps_score: number;
}
