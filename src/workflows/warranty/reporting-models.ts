export interface WarrantyOperationalDashboard {
  claims_raised: number;
  claims_submitted: number;
  pending_claims: number;
  awaiting_evidence: number;
  awaiting_approval: number;
  oem_pending: number;
  approved: number;
  rejected: number;
  settled: number;
  average_tat_hours: number;
}

export interface WarrantyFinancialDashboard {
  warranty_revenue: number;
  labour_recovery: number;
  parts_recovery: number;
  recovery_percentage: number;
  debit_notes_total: number;
}

export interface WarrantyAnalyticsDashboard {
  branch_performance: Record<string, number>;
  advisor_performance: Record<string, number>;
  technician_performance: Record<string, number>;
  repeat_failures_count: number;
  top_failed_parts: Array<{ part_number: string; count: number }>;
  top_complaint_codes: Array<{ complaint_code: string; count: number }>;
  oem_approval_rate: number;
}

export interface WarrantyAgingReport {
  thirty_days: number;
  sixty_days: number;
  ninety_days: number;
  over_ninety_days: number;
}

export interface WarrantyRejectionAnalysis {
  rejection_reason: string;
  count: number;
  financial_impact: number;
}

export interface WarrantyCustomerHistory {
  customer_id: string;
  total_claims: number;
  total_value: number;
  last_claim_date: string;
}

export interface WarrantyTechnicianComparison {
  technician_id: string;
  total_warranty_jobs: number;
  repeat_failure_rate: number;
  first_time_fix_rate: number;
}
