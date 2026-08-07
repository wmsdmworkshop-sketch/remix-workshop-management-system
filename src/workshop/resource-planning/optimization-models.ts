export interface OptimizationResult {
  optimization_id: string;
  workshop_id: string;
  timestamp: string;
  
  bay_allocation_score: number;
  technician_allocation_score: number;
  advisor_allocation_score: number;
  
  shift_utilization_percent: number;
  equipment_utilization_percent: number;
  
  workshop_load_balanced: boolean;
  branch_load_balanced: boolean;
  
  ai_shift_recommendation?: string;
  ai_branch_balancing?: string;
}
