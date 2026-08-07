export interface CustomerFeedback {
  feedback_id: string;
  job_card_id: string;
  customer_id: string;
  
  nps: number; // 0-10
  csat: number; // 1-5
  
  comments: string;
  complaints: string[];
  
  escalation_required: boolean;
  status: string; // SUBMITTED, REVIEWED, RESOLVED
}
