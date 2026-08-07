export interface GoodwillDashboardData {
  total_goodwill_cases: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  
  budget_used: number;
  budget_remaining: number;
  
  average_approval_time_hours: number;
  
  dealer_contribution_total: number;
  oem_contribution_total: number;
  customer_contribution_total: number;
  
  recovery_percent: number;
  repeat_goodwill_percent: number;
  
  commercial_score_distribution: Record<string, number>;
  branch_performance: Record<string, number>;
  advisor_performance: Record<string, number>;
  
  key_account_goodwill: number;
  fleet_goodwill: number;
}
