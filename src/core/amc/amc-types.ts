export type AmcProductType = "Basic" | "Silver" | "Gold" | "Platinum" | "Fleet" | "Custom" | "Unlimited" | "Preventive";
export type AmcContractType = "Individual" | "Fleet";
export type AmcContractState = "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "RENEWED";
export type CoverageItemType = "LABOUR" | "PARTS" | "CONSUMABLES" | "SPECIFIC_PART";

export interface AmcProduct {
  product_id: string;
  product_name: string;
  base_price: number;
  duration_months: number;
  km_limit: number;
  service_count_limit: number;
}

export interface AmcContract {
  contract_id: string;
  product_id: string;
  customer_id: string;
  contract_type: AmcContractType;
  start_date: Date;
  expiry_date: Date;
  workflow_state: AmcContractState;
  payment_status: "PENDING" | "PAID";
  total_value: number;
}

export interface AmcCoverageRule {
  coverage_id: string;
  product_id: string;
  item_type: CoverageItemType;
  item_code?: string;
  coverage_percentage: number;
}

export interface AmcConsumptionLedgerEntry {
  ledger_id: string;
  contract_id: string;
  vin: string;
  job_id: number;
  transaction_type: "DEBIT_SERVICE" | "DEBIT_AMOUNT" | "CREDIT_AMOUNT";
  amount?: number;
  service_count?: number;
  km_reading?: number;
  details?: string;
  timestamp: Date;
}

export type GradedCoverageDecision = 
  | "FULL_COVERAGE"
  | "PARTIAL_COVERAGE"
  | "APPROVAL_REQUIRED"
  | "REJECTED";

export interface CoverageEvaluationResult {
  decision: GradedCoverageDecision;
  percentage_covered: number;
  reason?: string;
}
