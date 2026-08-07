export interface BreakdownRecovery {
  incident_id: string;
  tow_required: boolean;
  tow_assigned: boolean;
  tow_vendor_id?: string;
  
  recovery_started_time?: string;
  recovery_completed_time?: string;
  
  recovery_cost: number;
  insurance_recovery_amount: number;
}
