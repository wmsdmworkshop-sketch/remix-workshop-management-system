export interface ProgramAgingReport {
  thirty_days: number;
  sixty_days: number;
  ninety_days: number;
  over_ninety_days: number;
}

export interface PendingProgramsReport {
  program_category: string;
  draft: number;
  awaiting_evidence: number;
  awaiting_approval: number;
  external_processing: number;
  total_pending: number;
}
