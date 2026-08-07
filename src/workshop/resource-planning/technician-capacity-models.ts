export interface TechnicianCapacity {
  technician_id: string;
  grade: string;
  certification: string[];
  
  vehicle_family_skills: string[]; // Ace, Intra, Yodha, 407, 709, 1109, 1512, LPT, Ultra, Signa, Prima, Bus
  aggregate_skills: string[];
  
  attendance: string;
  leave_status: string;
  shift_id: string;
  
  current_jobs: string[];
  planned_jobs: string[];
  
  utilization_percent: number;
  efficiency_percent: number;
  productivity_percent: number;
}
