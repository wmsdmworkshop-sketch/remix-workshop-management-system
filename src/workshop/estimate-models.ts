export interface Estimate {
  estimate_id: string;
  job_card_id: string;
  
  labour_estimate: number;
  parts_estimate: number;
  outside_labour: number;
  consumables: number;
  taxes: number;
  discount: number;
  
  total_amount: number;
  
  approval_status: string; // PENDING, APPROVED, PARTIALLY_APPROVED, REJECTED
  revision_history: {
    revision: number;
    amount: number;
    timestamp: string;
  }[];
  
  ai_labour_prediction?: number;
  ai_parts_prediction?: number;
}
