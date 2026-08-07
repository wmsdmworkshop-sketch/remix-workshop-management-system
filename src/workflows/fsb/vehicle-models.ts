export interface FsbVehicleTarget {
  vin: string;
  registration_number: string;
  model: string;
  engine: string;
  series: string;
  variant: string;
  manufacturing_date: string;
  retail_date: string;
  warranty_status: boolean;
  amc_status: boolean;
  current_odometer: number;
  branch_id: string;
  workshop_id: string;
  customer_id: string;
  fleet_id?: string;
  key_account_id?: string;
  eligibility_status: string; // ELIGIBLE, COMPLETED, PENDING, REJECTED
  
  // AI Readiness
  recommended_branch?: string;
  recommended_technician?: string;
  confidence_score?: number;
}
