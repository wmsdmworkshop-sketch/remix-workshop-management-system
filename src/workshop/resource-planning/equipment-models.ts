export interface Equipment {
  equipment_id: string;
  name: string;
  type: string; // LIFT, SPECIAL_TOOL, DIAGNOSTIC
  workshop_id: string;
  
  calibration_due_date?: string;
  availability_status: string; // AVAILABLE, IN_USE, MAINTENANCE
  assigned_technician_id?: string;
  preventive_maintenance_due: boolean;
  last_inspection_date: string;
}
