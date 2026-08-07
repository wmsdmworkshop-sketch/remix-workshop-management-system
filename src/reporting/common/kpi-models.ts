export interface BranchPerformanceKPI {
  branch_id: string;
  total_programs: number;
  average_tat_hours: number;
  programs_by_category: Record<string, number>;
}

export interface AdvisorPerformanceKPI {
  advisor_id: string;
  programs_handled: number;
  evidence_completeness_rate: number;
}

export interface TechnicianPerformanceKPI {
  technician_id: string;
  total_jobs: number;
  first_time_fix_rate: number;
  repeat_repair_rate: number;
}

export interface ApprovalSLA {
  approval_level: string;
  average_time_minutes: number;
  violations_count: number;
}

export interface EvidenceCompleteness {
  program_category: string;
  missing_evidence_count: number;
  frequently_missing_types: string[];
}
