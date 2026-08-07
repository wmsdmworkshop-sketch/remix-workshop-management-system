export interface QualityControl {
  qc_id: string;
  job_card_id: string;
  qc_inspector_id: string;
  
  status: string; // PENDING, PASSED, REWORK_REQUIRED
  
  checklist: {
    item: string;
    passed: boolean;
    remarks: string;
  }[];
  
  defects_found: string[];
  rework_details?: string;
  
  qc_time: string;
}
