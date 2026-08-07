export interface AmcDashboardData {
  active_contracts: number;
  expired_contracts: number;
  renewals_due: number;
  revenue: number;
  remaining_liability: number;
  upcoming_services: number;
  completed_services: number;
  coverage_utilization_percent: number;
  customer_retention_percent: number;
  branch_performance: Record<string, number>;
  advisor_performance: Record<string, number>;
}
