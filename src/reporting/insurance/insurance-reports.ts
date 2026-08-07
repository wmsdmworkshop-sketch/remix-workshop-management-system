export interface PolicyRegisterReport {
  policy_number: string;
  insurer: string;
  policy_type: string;
  vehicle_vin: string;
  effective_date: string;
  expiry_date: string;
  status: string;
  premium_amount: number;
}

export interface CoverageReport {
  policy_id: string;
  claim_id?: string;
  status: string;
  covered_amount: number;
}

export interface ClaimRegisterReport {
  claim_id: string;
  policy_id: string;
  job_card_id: string;
  total_claim_amount: number;
  status: string;
}

export interface SettlementReport {
  claim_id: string;
  total_repair_cost: number;
  insurer_settlement: number;
  customer_contribution: number;
  recovery_amount: number;
}

export interface RecoveryReport {
  claim_id: string;
  recovery_amount: number;
  write_off_amount: number;
}

export interface RenewalReport {
  policy_id: string;
  original_expiry_date: string;
  renewal_premium: number;
  status: string;
}

export interface FleetContractRegisterReport {
  contract_number: string;
  fleet_customer_id: string;
  contract_type: string;
  vehicle_count: number;
  status: string;
}

export interface FleetUtilizationReport {
  contract_id: string;
  total_services: number;
  total_covered_amount: number;
}

export interface FleetRevenueReport {
  contract_id: string;
  total_revenue: number;
}

export interface PricingAnalysisReport {
  contract_id: string;
  labour_rate_discount: number;
  parts_discount: number;
}
