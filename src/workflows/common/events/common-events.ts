export interface BusinessProgramEvent {
  program_id: string;
  program_type: string;
  business_case_id: string;
  timestamp: string;
  actor?: string;
  payload?: any;
}

export interface BusinessProgramCreated extends BusinessProgramEvent {}
export interface BusinessProgramUpdated extends BusinessProgramEvent {}
export interface BusinessProgramSubmitted extends BusinessProgramEvent {}
export interface BusinessProgramApproved extends BusinessProgramEvent {}
export interface BusinessProgramRejected extends BusinessProgramEvent {}
export interface BusinessProgramSettled extends BusinessProgramEvent {}
export interface BusinessProgramCancelled extends BusinessProgramEvent {}
export interface BusinessProgramClosed extends BusinessProgramEvent {}

export interface EvidenceRequested extends BusinessProgramEvent {
  evidence_type: string;
}

export interface EvidenceUploaded extends BusinessProgramEvent {
  evidence_id: string;
  evidence_type: string;
}

export interface ApprovalRequested extends BusinessProgramEvent {
  approval_step: string;
}

export interface ApprovalCompleted extends BusinessProgramEvent {
  approval_step: string;
  decision: "APPROVED" | "REJECTED";
}

export interface SettlementCompleted extends BusinessProgramEvent {
  settlement_reference: string;
  amount: number;
}
