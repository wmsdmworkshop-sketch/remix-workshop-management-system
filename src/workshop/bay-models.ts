export interface Bay {
  bay_id: string;
  name: string;
  capacity: string;
  status: string; // WAITING_QUEUE, OCCUPIED, IDLE, RESERVED, MAINTENANCE
  
  current_job_card_id?: string;
  technician_id?: string;
  
  utilization_percent?: number;
  ai_bay_recommendation?: string;
}
