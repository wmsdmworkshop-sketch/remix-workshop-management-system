export interface Inspection {
  inspection_id: string;
  job_card_id?: string;
  vehicle_registration: string;
  advisor_id: string;
  inspection_time: string;
  
  visual_inspection: {
    tyres: string;
    battery: string;
    lights: string;
    fluid_levels: string;
    leaks: string;
    brakes: string;
    suspension: string;
    electrical: string;
    body: string;
  };
  
  photos: string[];
  videos: string[];
  
  customer_approval: boolean;
  status: string; // PENDING, COMPLETED, APPROVED
  
  ai_quality_risk?: string;
}
