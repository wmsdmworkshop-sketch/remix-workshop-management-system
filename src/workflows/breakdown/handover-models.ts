export interface BreakdownHandover {
  incident_id: string;
  workshop_id: string;
  
  gate_entry_time?: string;
  job_card_id?: string;
  
  service_advisor_id?: string;
  technician_id?: string;
  bay_allocation?: string;
  
  workshop_status: string; // IN_WORKSHOP, REPAIRING, DELIVERED
}
