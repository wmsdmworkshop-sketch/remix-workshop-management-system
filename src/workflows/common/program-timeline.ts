export interface TimelineEvent {
  event_id: string;
  timestamp: string;
  step: string;
  description: string;
  actor: string;
}

export interface ProgramTimeline {
  created_at: string;
  assigned_at?: string;
  evidence_uploaded_at?: string;
  approval_requested_at?: string;
  approved_at?: string;
  rejected_at?: string;
  submitted_at?: string;
  external_processing_started_at?: string;
  external_processing_completed_at?: string;
  settlement_at?: string;
  closed_at?: string;
  
  milestones: string[];
  events: TimelineEvent[];
  
  current_step: string;
  previous_step?: string;
  next_step?: string;
  
  sla_clock_active: boolean;
  paused_at?: string;
  resumed_at?: string;
  
  elapsed_time_minutes: number;
  waiting_time_minutes: number;
  completion_time_minutes?: number;
}
