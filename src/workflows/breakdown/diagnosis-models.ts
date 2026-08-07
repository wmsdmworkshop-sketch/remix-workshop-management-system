export interface BreakdownDiagnosis {
  incident_id: string;
  failure_category: string;
  aggregate: string;
  root_cause: string;
  
  temporary_repair_done: boolean;
  permanent_repair_required: boolean;
  parts_required: string[];
  
  can_continue_journey: boolean;
  tow_required: boolean;
  
  ai_root_cause?: string;
  ai_parts_recommendation?: string[];
}
