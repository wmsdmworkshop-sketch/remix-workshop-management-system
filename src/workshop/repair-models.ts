export interface RepairOperation {
  operation_id: string;
  job_card_id: string;
  
  description: string;
  technician_id: string;
  
  status: string; // PENDING, IN_PROGRESS, PAUSED, COMPLETED
  
  start_time?: string;
  end_time?: string;
  pause_history: {
    pause_time: string;
    resume_time?: string;
    reason: string;
  }[];
  
  labour_hours: number;
}
