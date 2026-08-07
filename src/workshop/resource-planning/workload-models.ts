export interface Workload {
  workload_id: string;
  workshop_id: string;
  date: string;
  
  bay_shortage: boolean;
  technician_shortage: boolean;
  parts_delay: boolean;
  equipment_downtime: boolean;
  approval_delays: boolean;
  qc_queue: boolean;
  delivery_queue: boolean;
  
  ai_delay_prediction?: boolean;
}
