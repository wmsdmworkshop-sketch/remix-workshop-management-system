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
  certification_level?: 'Not Certified' | 'Bronze' | 'Silver' | 'Gold' | string;
  certification_date?: string;
  certification_expiry_date?: string;
  certification_remarks?: string;
  profile_photo?: string; // base64 reference photo for face matching

  // New profile fields
  alt_mobile?: string | null;
  email?: string | null;
  crm_id?: string | null;   // Tata Siebel/CRM login id (e.g. CSP_100B210)
  lms_id?: string | null;   // Learning Management System (training/certification) id
  department?: string | null;
  designation?: string | null;
  workshop?: string | null;
  reporting_manager?: string | null;
  date_of_joining?: string | null;
  bank_details?: string | null;
  pan?: string | null;
  aadhaar?: string | null;
  workshop_id?: number | null;
  shift_id?: number | null;
  joining_date?: string | null;
  profile_photo_url?: string | null;
  face_embedding_reference?: string | null;
  record_status?: 'CANONICAL' | 'LEGACY' | string;
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
  break_start?: string | null;
  break_end?: string | null;
  is_late?: boolean;
  late_reason?: string;
  is_overtime?: boolean;
  overtime_hours?: number;
}

/**
 * A workshop bay as served by GET /api/bays — i.e. a row of the `bays` table.
 *
 * bay_id is a NUMBER here and that is correct, despite there being a second bay
 * table with string ids. The workshop keeps two:
 *
 *   bays      bay_id INT (1..16)        — this interface; what /api/bays serves,
 *                                         and what job_card_master.bay_id
 *                                         (int unsigned) references
 *   tbl_bays  bay_id VARCHAR ("B01")    — the floor engine's live occupancy and
 *                                         allocation record
 *
 * They are not duplicates; they are two halves of a split that was never
 * finished. Repointing this interface (or /api/bays) at tbl_bays would break
 * every `j.bay_id === bay.bay_id` join — Dashboard bay occupancy,
 * ActiveBayTatMonitor and WorkshopDashboard all do exactly that, and a number
 * never equals "B01".
 *
 * `status` is the BAY vocabulary ('Idle' | 'Active' | 'Carry Forward'), which is
 * unrelated to JobCard.status. Left as `string` because migration 020's roster
 * and the legacy rows do not yet agree on a closed set.
 */
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
  crm_job_card_no?: string | null;
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
  /**
   * The job's workload status — job_card_master.job_status, mapped straight
   * onto this field by /api/job-cards (server.ts:1690).
   *
   * THIS UNION IS THE COLUMN'S ENUM, taken from the live schema rather than
   * from the values that happen to be present today. Typing only the observed
   * four would have made 'Open', 'Waiting Parts', 'Assigned', 'In Queue' and
   * 'Carry Forward' compile errors the moment a real job reached one of them.
   *
   * It previously read
   *   'Waiting' | 'Active' | 'Completed' | 'Invoiced' | 'Carry Forward'
   *   | 'Rework' | 'Cancelled'
   * and had almost no overlap with the schema: of those seven only
   * 'Carry Forward' is a legal value, and all 183 production rows held
   * something the type declared impossible. Roughly 80 comparisons against the
   * phantom values type-checked cleanly while matching nothing — which is why
   * the Dashboard reported 0 open job cards against 162 genuinely open.
   *
   * WHAT THE VALUES MEAN, derived from the data attached to them rather than
   * assumed:
   *   In Progress  158 rows — no gate-out, no delivery, no invoice; 108 have a
   *                technician and 106 a bay. Work in the workshop.
   *   Ready         20 rows — actual_delivery set on ALL of them, but no
   *                gate_out_time and no invoice. Work finished, vehicle not yet
   *                released. NOT the same as invoiced.
   *   Delivered      1 row  — gate_out_time, actual_delivery and invoice_no all
   *                set. The complete end state.
   *   Unassigned     4 rows — nothing attached. Awaiting allocation.
   *
   * Values legal in the schema but not currently present: Open, Waiting Parts,
   * Assigned, In Queue, Carry Forward.
   *
   * NOTE: this is the WORKLOAD status, not the workflow position. The lifecycle
   * stage lives in workshop_stage / live_status, and billing is tracked
   * separately in billing_status ('Pending' | 'Paid'). Conflating them is what
   * put "Completed" on the advisor card beside a live Start Intake button.
   */
  status:
    | 'Open'
    | 'In Progress'
    | 'Waiting Parts'
    | 'Ready'
    | 'Delivered'
    | 'Carry Forward'
    | 'Assigned'
    | 'Unassigned'
    | 'In Queue';
  etd: string;
  started_at: string | null;
  completed_at: string | null;
  invoiced_at: string | null;
  created_by: number;
  created_at: string;
  updated_at?: string;
  rework_count?: number;
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
  /**
   * evidence_id of the ocr_evidence row for the gate photo, carried from
   * /api/ocr so the gate-in pipeline can stamp gate_entry_id onto it. Not a
   * persisted job-card column — transport only.
   */
  evidence_id?: string | null;
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
  workshop_id?: number | null;
  chassis_no?: string | null;
  chassis_number?: string | null;
  odometer_reading?: number | string | null;
  current_workflow_state?: string;
  current_queue?: string;
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
  role_id: number;
  is_active?: boolean;
  employee_id?: number | null;
  created_at?: string;
  last_login?: string | null;
  email?: string | null;
  mobile_no?: string | null;
}

export interface Role {
  role_id: number;
  role_name: string;
  permission_level: string;
}

export interface Module {
  module_id: number;
  module_name: string;
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
  role_id: number;
  module_id: number;
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

export interface Workshop {
  workshop_id: number;
  workshop_name: string;
  latitude: number;
  longitude: number;
  allowed_gps_radius: number;
  is_active: boolean;
}

export interface Shift {
  shift_id: number;
  shift_type: 'General' | 'Morning' | 'Evening' | 'Night' | 'Holiday' | 'Emergency' | string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface ApprovalMatrix {
  matrix_id: number;
  module_name: string;
  ot_category: 'WORKSHOP' | 'ADMINISTRATIVE' | string;
  workshop_id: number;
  role_name: string;
  approval_level: number;
  is_active: boolean;
}

export interface OvertimeRequest {
  ot_id: number;
  employee_id: number;
  ot_category: 'WORKSHOP' | 'ADMINISTRATIVE' | string;
  date: string;
  shift_id: number;
  ot_start_time: string;
  ot_end_time: string;
  total_hours: number;
  benefit_type: 'MONETARY' | 'COMPENSATORY_ATTENDANCE_CREDIT' | string;
  ot_reason_category: string;
  job_card_id?: number | null;
  workshop_id?: number | null;
  department?: string | null;
  work_description?: string | null;
  comp_attendance_credit_earned?: number;
  snapshot_basic_salary?: number;
  snapshot_days_in_month?: number;
  hourly_salary_rate?: number;
  calculated_amount?: number;
  max_allowed_cap?: number;
  final_payable_amount?: number;
  capping_reason?: string | null;
  device_name: string;
  operating_system: string;
  app_version: string;
  ip_address: string;
  device_time: string;
  server_time?: string;
  time_difference_seconds: number;
  face_verification_provider?: string | null;
  face_match_result?: string | null;
  face_match_score?: number | null;
  face_verification_time?: string | null;
  ocr_provider?: string | null;
  ocr_confidence?: number | null;
  ocr_verification_time?: string | null;
  gps_lat: number;
  gps_lng: number;
  gps_matched: boolean;
  ai_recommendation_status?: 'APPROVE' | 'REJECT' | 'MANAGER_REVIEW_REQUIRED' | 'PENDING' | string;
  ai_flags?: string | null;
  current_level: number;
  current_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ON_HOLD' | 'PAID' | string;
  payroll_period?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  created_by: number;
  created_at?: string;
  updated_at?: string;
}

export interface OvertimeAttachment {
  attachment_id: number;
  ot_id: number;
  attachment_type: 'SELFIE' | 'JOB_CARD_PHOTO' | string;
  file_path: string;
  uploaded_at?: string;
}

export interface OvertimeWorkflowHistory {
  history_id: number;
  ot_id: number;
  level: number;
  approver_id: number;
  approver_role: string;
  action_date: string;
  action_time: string;
  decision: 'APPROVED' | 'REJECTED' | 'HOLD' | string;
  remarks?: string | null;
}

export interface OvertimeApiLog {
  log_id: number;
  request_id: string;
  user_id?: number | null;
  api_endpoint: string;
  ip_address: string;
  device_info: string;
  execution_duration_ms: number;
  response_status: number;
  timestamp?: string;
}

export interface OvertimeAuditLog {
  log_id: number;
  ot_id: number;
  action: 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT' | 'HOLD' | 'PAY' | string;
  actor_id: number;
  actor_role: string;
  timestamp?: string;
  ip_address: string;
  payload_diff: string;
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_WORKFORCE_PROFILE?: string;
    readonly [key: string]: any;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

/**
 * JOB STATUS VOCABULARY — the single definition of what job_status means.
 *
 * Every consumer used to compare against 'Active', 'Waiting', 'Completed' and
 * 'Invoiced'. None of those are legal values of job_card_master.job_status, so
 * roughly 80 comparisons across 11 files matched nothing while type-checking
 * cleanly. The Dashboard reported 0 open job cards against 162 genuinely open.
 *
 * These predicates exist so the mapping lives in ONE place. A future change to
 * the workshop's vocabulary is then a change here, not a hunt through eleven
 * components for string literals that silently stop matching.
 *
 * Meanings were derived from the data attached to each status in production,
 * not assumed — see the note on JobCard.status.
 */

/** Legal values of job_card_master.job_status, from the column's own ENUM. */
export const JOB_STATUS_VALUES = [
  'Open', 'In Progress', 'Waiting Parts', 'Ready', 'Delivered',
  'Carry Forward', 'Assigned', 'Unassigned', 'In Queue'
] as const;

export type JobStatus = typeof JOB_STATUS_VALUES[number];

/**
 * The job is live in the workshop — received, not yet finished.
 * Replaces `status === "Active" || status === "Waiting"`.
 */
export function isOpenJobStatus(status?: string | null): boolean {
  return ['Open', 'In Progress', 'Waiting Parts', 'Assigned', 'Unassigned', 'In Queue', 'Carry Forward']
    .includes(String(status ?? ''));
}

/**
 * Work is finished. NOT the same as invoiced or released — every 'Ready' row in
 * production carries actual_delivery but no gate_out_time and no invoice_no.
 * Replaces `status === "Completed"`.
 */
export function isWorkCompleteStatus(status?: string | null): boolean {
  return status === 'Ready' || status === 'Delivered';
}

/**
 * The vehicle has left: gate_out_time, actual_delivery and invoice_no all set.
 * Replaces `status === "Invoiced"`. Note that billing is tracked separately in
 * billing_status ('Pending' | 'Paid'); this is the workload end state, not
 * proof of payment.
 */
export function isDeliveredStatus(status?: string | null): boolean {
  return status === 'Delivered';
}

/**
 * The vehicle has left the site, so the card is HISTORY, not work.
 *
 * Two independent signals, either one sufficient:
 *   - status === 'Delivered'   — the workflow's own claim that the visit ended;
 *   - a recorded gate_out_time — the ground truth that it physically left.
 *
 * gate_out_time has to stand on its own because historically imported cards
 * carry a gate-out stamp while their status was mapped from a free-text column,
 * and because the gate-out route stamps the time whether or not the workload
 * status was moved with it.
 *
 * Deliberately NOT the same as isWorkCompleteStatus: 'Ready' means the work is
 * done but the vehicle is still on site, still holding a bay, and still the
 * workshop's problem. Only departure removes a card from the floor.
 *
 * This exists so "still in the workshop" has ONE definition. Two copies of it
 * had already drifted — see isDeliveredStatus's siblings above for why comparing
 * against values the schema cannot hold is the recurring failure mode here.
 */
export function hasLeftWorkshop(
  job: { status?: string | null; gate_out_time?: string | null } | null | undefined
): boolean {
  if (!job) return false;
  return isDeliveredStatus(job.status) || !!job.gate_out_time;
}

/**
 * Waiting for allocation — no technician and no bay yet.
 * Replaces the `status === "Waiting" && !bay_id` idiom.
 */
export function isAwaitingAllocationStatus(status?: string | null): boolean {
  return status === 'Unassigned' || status === 'Open' || status === 'In Queue';
}
