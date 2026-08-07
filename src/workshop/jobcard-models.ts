export interface JobCard {
  job_card_number: string;
  gate_entry_id: string;
  
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  
  vehicle: {
    vin: string;
    registration: string;
    make: string;
    model: string;
  };
  
  advisor_id: string;
  opening_km: number;
  complaint: string;
  category: string; // PERIODIC_MAINTENANCE, RUNNING_REPAIR, BODY_SHOP
  priority: string; // NORMAL, HIGH, URGENT
  
  linked_business_programs: {
    program_type: string; // WARRANTY, AMC, GOODWILL, FSB, INSURANCE, FLEET, BREAKDOWN
    reference_id: string;
  }[];
  
  current_stage: string; // RECEPTION, ESTIMATION, APPROVAL, REPAIR, QC, ROAD_TEST, WASH, DELIVERY
  current_status: string; // OPEN, IN_PROGRESS, ON_HOLD, COMPLETED, CLOSED
  
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  
  ai_delivery_prediction?: string;
  confidence_score?: number;
}
