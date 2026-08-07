export interface AdvisorCapacity {
  advisor_id: string;
  assigned_job_cards: string[];
  open_job_cards: number;
  delivery_pending: number;
  
  revenue_labour: number;
  revenue_parts: number;
  
  average_tat_hours: number;
  customer_rating: number; // 1-5
}
