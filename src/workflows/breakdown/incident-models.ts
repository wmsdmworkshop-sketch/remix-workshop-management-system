/**
 * BreakdownIncident DTO — standalone (does not extend ProgramDefinition to avoid incompatibility).
 * Breakdown (roadside assistance) incident domain-specific data.
 */
export interface BreakdownIncident {
  incident_number: string;
  call_number: string;
  customer_id: string;
  driver_name: string;
  mobile_number: string;
  
  vehicle_vin: string;
  registration_number: string;
  current_odometer: number;
  
  breakdown_date: string;
  breakdown_time: string;
  breakdown_type: string;
  complaint: string;
  symptoms: string[];
  
  severity: string;
  priority: string;
  status: string;
  
  // AI Readiness
  ai_failure_prediction?: string;
  ai_route_recommendation?: string;
  ai_risk_score?: number;
  confidence_score?: number;
}
