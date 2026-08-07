export interface FsbDashboardData {
  total_campaigns: number;
  active_campaigns: number;
  completed_vehicles: number;
  pending_vehicles: number;
  
  campaign_coverage_percent: number;
  branch_completion_percent: Record<string, number>;
  workshop_completion_percent: Record<string, number>;
  
  technician_performance: Record<string, number>;
  advisor_performance: Record<string, number>;
  
  recovery_percent: number;
  claims_pending: number;
  claims_approved: number;
  claims_rejected: number;
  campaign_cost: number;
}
