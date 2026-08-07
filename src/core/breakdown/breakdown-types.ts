export type BreakdownSeverity = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type BreakdownPriority = "LOW" | "NORMAL" | "PASSENGER_VEHICLE" | "FLEET_BREAKDOWN" | "ACCIDENT" | "VEHICLE_OFF_ROAD" | "CRITICAL";
export type BreakdownSource = "CUSTOMER_CALL" | "TATA_HELPLINE" | "CRM" | "FLEET_PORTAL" | "MOBILE_APP";

export type BreakdownWorkflowState = 
  | "REPORTED" 
  | "VALIDATED" 
  | "ASSIGNED" 
  | "DISPATCHED" 
  | "EN_ROUTE" 
  | "ON_SITE" 
  | "DIAGNOSIS" 
  | "REPAIR_IN_PROGRESS" 
  | "RESOLVED_ON_SITE" 
  | "TOW_REQUIRED" 
  | "WORKSHOP_REACHED" 
  | "CLOSED";

export type DispatchStatus = "PENDING" | "ACCEPTED" | "EN_ROUTE" | "ARRIVED" | "COMPLETED" | "REASSIGNED";

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface ResourceAllocationRequest {
  case_id: string;
  location: GeoLocation;
  required_skills?: string[];
  vehicle_model?: string;
  is_mobile_van_required?: boolean;
}

export interface AllocatedResource {
  workshop_id: string;
  qrt_team_id?: string;
  technician_id: string;
  mobile_van_id?: string;
  estimated_arrival_minutes: number;
  confidence_score: number; // Based on skills, workload, traffic, etc.
}

export interface TowRequest {
  case_id: string;
  vendor_id?: string;
  tow_vehicle_number?: string;
  destination_workshop_id: string;
  distance_km: number;
  tow_charges: number;
}
