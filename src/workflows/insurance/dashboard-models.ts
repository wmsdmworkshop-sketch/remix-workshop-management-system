export interface InsuranceDashboardData {
  active_policies: number;
  expired_policies: number;
  
  claims_pending: number;
  claims_approved: number;
  claims_rejected: number;
  
  settlement_value: number;
  recovery_percent: number;
  renewal_percent: number;
  policy_coverage_percent: number;
}
