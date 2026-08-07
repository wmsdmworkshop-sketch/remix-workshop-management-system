export interface FinancialSummaryReport {
  program_category: string;
  total_claim_value: number;
  total_approved_value: number;
  total_settled_value: number;
}

export interface RecoverySummaryReport {
  program_category: string;
  total_labour_recovery: number;
  total_parts_recovery: number;
  overall_recovery_percentage: number;
  total_debit_notes: number;
}
