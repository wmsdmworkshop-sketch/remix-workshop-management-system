export interface SpecialTool {
  tool_id: string;
  name: string;
  calibration_due_date?: string;
  availability_status: string; // AVAILABLE, IN_USE, MAINTENANCE
  assigned_technician_id?: string;
}
