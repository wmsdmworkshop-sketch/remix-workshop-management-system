export interface Employee {
  employee_id: number;
  full_name: string;
  employee_code: string;
  role: string;
  employee_grade: 'Junior' | 'Senior';
  basic_salary: number;
  mobile: string;
  is_active: boolean;
  created_at?: string;
  allocated_revenue?: number;
  target_revenue?: number;
  paid_pct?: string;
  tml_claim_pct?: string;
  certification_level?: 'Bronze' | 'Silver' | 'Gold';
  certification_date?: string;
  profile_photo?: string; // base64 reference photo for face matching
}

export interface WorkforceAttendance {
  attendance_id: number;
  employee_id: number;
  shift_date: string;
  check_in: string | null;
  check_out: string | null;
  shift_type: 'Morning' | 'Afternoon' | 'Night';
  status: 'Present' | 'Absent' | 'Leave' | 'Half Day';
  notes?: string;
  created_at?: string;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
  face_photo_in?: string | null; // base64 captured at check-in
  face_photo_out?: string | null; // base64 captured at check-out
  face_match_score_in?: number | null; // similarity score 0 to 1
  face_match_score_out?: number | null; // similarity score 0 to 1
  is_approved?: boolean;
}

export interface Bay {
  bay_id: number;
  bay_code: string;
  bay_name: string;
  bay_type: string;
  status: string;
  is_active: boolean;
}

export interface SRType {
  sr_type_id: number;
  sr_type_code: string;
  sr_type_name: string;
  default_duration_mins: number;
  is_active: boolean;
}

export interface JobCard {
  job_id: number;
  job_card_no: string;
  vrn: string;
  vin?: string;
  customer_name: string;
  customer_mobile: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  km_reading?: number | null;
  sr_type_id: number;
  job_description: string;
  priority: 'Normal' | 'Express';
  bay_id: number | null;
  status: 'Waiting' | 'Active' | 'Completed' | 'Invoiced' | 'Carry Forward' | 'Rework' | 'Cancelled';
  etd: string;
  started_at: string | null;
  completed_at: string | null;
  invoiced_at: string | null;
  created_by: number;
  created_at: string;
  updated_at?: string;
  workshop_stage?: string;
  l1_delay?: string;
  l2_delay?: string;
  l3_delay?: string;
  l5_delay?: string;
  delay_notes?: string;
  time_slot?: string;
  tat_status?: string;
  pending_reason?: string;
  remarks?: string;
  date_in?: string;
  time_in?: string;
  expected_date_out?: string;
  expected_time_of_completion?: string;
  time_out?: string;
  date_completed?: string;
  bay_no?: string | null;
  service_advisor?: string | null;
  technician_name?: string | null;
  no_of_laborers?: number | null;
  numberplate_photo?: string | null;
  odometer_photo?: string | null;
  labor_price?: number;
  parts_price?: number;
  warranty_status?: string;
  job_status_master?: string | null;
  live_status_master?: string | null;
  in_job_card_technician?: boolean;
  in_bay_queue?: boolean;
  bay_queue_status?: string | null;
  parts_list?: string;
  actual_time_taken?: string | null;
  service_type_master?: string | null;
  technician_assignments?: Array<{ technician_id: number; technician_name: string; role_type: string; assigned_at: string | null }>;
  completed_today?: boolean;
  invoice_no?: string | null;
  gate_out_time?: string | null;
  billing_status?: string | null;
}

export interface JobTechnicianMap {
  map_id: number;
  job_id: number;
  employee_id: number;
  tech_role: 'Primary Technician' | 'Co-Technician' | 'Electrician' | 'Add Tech';
  assigned_at?: string;
}

export interface RevenueSplitMaster {
  split_id: number;
  combination_code: string;
  combination_label: string;
  person_count: number;
  tech_pct: number;
  co_tech_pct: number;
  electrician_pct: number;
  add_tech_pct: number;
  uses_salary_wt: boolean;
  senior_override: boolean;
  notes: string;
  is_active: boolean;
}

export interface JobRevenue {
  revenue_id: number;
  job_id: number;
  labour_amount: number;
  parts_amount: number;
  total_amount: number;
  split_id: number;
  calculated_at?: string;
}

export interface JobRevenueSplitDetail {
  detail_id: number;
  revenue_id: number;
  employee_id: number;
  tech_role: 'Primary Technician' | 'Co-Technician' | 'Electrician' | 'Add Tech';
  split_pct: number;
  split_amount: number;
}

export interface CarryForwardLog {
  cf_id: number;
  job_id: number;
  cf_reason: string;
  raised_by: number;
  approved_by: number | null;
  cf_status: 'Pending' | 'Approved' | 'Rejected';
  raised_at: string;
  actioned_at?: string | null;
}

export interface ReworkLog {
  rework_id: number;
  original_job_id: number;
  new_job_id: number | null;
  rework_reason: string;
  original_tech_id: number;
  raised_by: number;
  approved_by: number | null;
  rework_status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  raised_at: string;
  actioned_at?: string | null;
}

export interface AlertConfigMaster {
  alert_config_id: number;
  alert_code: string;
  alert_name: string;
  alert_category: 'ETD' | 'Bay' | 'Productivity' | 'Revenue' | 'Parts';
  trigger_condition: string;
  threshold_value: number;
  threshold_unit: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  is_active: boolean;
}

export interface AlertLog {
  alert_id: number;
  alert_config_id: number;
  entity_type: string;
  entity_id: number;
  alert_message: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Active' | 'Acknowledged' | 'Resolved' | 'Escalated';
  acknowledged_by: number | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface DMSImportBatch {
  batch_id: number;
  imported_by: number;
  file_name: string;
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  status: 'Processing' | 'Completed' | 'Failed';
  imported_at: string;
}

export interface DMSImportRow {
  row_id: number;
  batch_id: number;
  row_number: number;
  vrn: string;
  job_date: string;
  sr_type: string;
  labour_amount: number;
  parts_amount: number;
  total_amount: number;
  matched_job_id: number | null;
  match_status: 'Matched' | 'Unmatched' | 'Conflict' | 'Resolved';
  conflict_reason: string | null;
  resolved_by: number | null;
  resolved_at: string | null;
  raw_data?: any;
}

export interface User {
  user_id: number;
  username: string;
  full_name: string;
  role: string;
  is_active?: boolean;
  employee_id?: number | null;
  created_at?: string;
  last_login?: string | null;
}

export interface JobRevenueSplit {
  id: number;
  job_id: number;
  employee_id: number;
  allocated_amount: number;
  percentage: number;
  created_at?: string;
}

export interface TechnicianKPIDaily {
  id: number;
  employee_id: number;
  kpi_date: string;
  jobs_assigned: number;
  jobs_completed: number;
  jobs_open: number;
  revenue_earned: number;
  avg_job_duration: number;
  completion_efficiency: number;
  utilization_percent: number;
  rework_count: number;
  rework_percent: number;
  tml_claims: number;
  tml_claim_rate: number;
  avg_revenue_per_job: number;
  on_time_completion: number;
  quality_score: number;
  idle_time: number;
  break_time: number;
  overtime_hours: number;
  health_status: string;
  created_at?: string;
}

export interface ProductivityAlert {
  id: number;
  employee_id: number;
  alert_type: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  trigger_value: number;
  threshold_value: number;
  alert_message: string;
  recommended_action: string;
  status: 'Active' | 'Resolved' | string;
  created_at?: string;
  resolved_at?: string;
}

export interface ReworkTracking {
  id: number;
  original_job_id: number;
  rework_job_id: number;
  vehicle_reg: string;
  assigned_technician_id: number;
  original_closure_date: string;
  rework_date: string;
  days_since_original: number;
  original_issue: string;
  rework_reason: string;
  rework_completed: boolean;
  rework_revenue: number;
  created_at?: string;
}export interface RolePermission {
  permission_id: number;
  role_name: string;
  module_name: string;
  can_view: boolean;
  can_edit: boolean;
  can_comment: boolean;
  updated_by?: number | null;
  updated_at?: string;
}

export interface FsbMaster {
  fsb_id: number;
  job_card_id: number;
  fsb_status: 'Settled' | 'Rejected' | 'Deviation';
}
