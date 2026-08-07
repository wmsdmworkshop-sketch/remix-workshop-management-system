export interface IncidentRegisterReport {
  incident_number: string;
  customer_name: string;
  vehicle_vin: string;
  breakdown_type: string;
  priority: string;
  severity: string;
  status: string;
  creation_date: string;
}

export interface ResponseTimeReport {
  incident_id: string;
  qrt_id: string;
  dispatch_time: string;
  reached_time: string;
  response_time_mins: number;
  sla_breached: boolean;
}

export interface EtaReport {
  incident_id: string;
  expected_arrival: string;
  actual_arrival: string;
  variance_mins: number;
}

export interface SlaReport {
  total_incidents: number;
  incidents_within_sla: number;
  incidents_breached: number;
  sla_compliance_percent: number;
}

export interface RecoveryTowReport {
  incident_id: string;
  tow_vendor_id: string;
  recovery_started: string;
  recovery_completed: string;
  recovery_cost: number;
}

export interface TechnicianPerformanceReport {
  technician_id: string;
  total_incidents_attended: number;
  average_resolution_time_mins: number;
  first_time_fix_rate_percent: number;
}

export interface BranchPerformanceReport {
  branch_id: string;
  total_incidents: number;
  sla_compliance_percent: number;
  average_cost_per_incident: number;
}
