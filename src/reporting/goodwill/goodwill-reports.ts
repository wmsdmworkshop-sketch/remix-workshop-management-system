export interface GoodwillRegisterReport {
  request_number: string;
  customer_name: string;
  vehicle_vin: string;
  goodwill_type: string;
  requested_date: string;
  status: string;
  total_cost: number;
}

export interface GoodwillApprovalAgingReport {
  pending_0_to_2_days: number;
  pending_3_to_7_days: number;
  pending_over_7_days: number;
}

export interface GoodwillContributionAnalysisReport {
  goodwill_type: string;
  total_dealer_contribution: number;
  total_oem_contribution: number;
  total_customer_contribution: number;
  average_dealer_percent: number;
}

export interface GoodwillBudgetReport {
  branch_id: string;
  allocated_budget: number;
  used_budget: number;
  remaining_budget: number;
  utilization_percent: number;
}

export interface GoodwillCommercialScoreReport {
  score_range_0_40: number; // HIGH risk
  score_range_41_70: number; // MEDIUM risk
  score_range_71_100: number; // LOW risk
  average_score: number;
}

export interface GoodwillRepeatAnalysisReport {
  total_goodwill_cases: number;
  repeat_cases: number;
  repeat_rate_percent: number;
  top_repeat_vins: string[];
}
