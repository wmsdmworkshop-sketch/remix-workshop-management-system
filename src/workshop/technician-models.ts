export interface Technician {
  technician_id: string;
  name: string;
  
  skill_matrix: string[];
  certification: string[];
  
  attendance: string; // PRESENT, ABSENT, LEAVE
  shift: string; // MORNING, EVENING, NIGHT
  
  current_jobs: string[]; // array of job_card_ids
  
  productivity_percent: number;
  efficiency_percent: number;
  idle_time_mins: number;
  
  ai_technician_recommendation?: string;
}
