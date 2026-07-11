import { mysqlTable, serial, text, int, boolean, timestamp, decimal, index, uniqueIndex, bigint } from "drizzle-orm/mysql-core";

// =============================================================================
// WOS ENUMS & TYPES (Architecture v1.0)
// =============================================================================

export const WorkflowState = [
  "GATE_IN",
  "INTAKE_PENDING",
  "DIAGNOSTIC_WIP",
  "ESTIMATE_PENDING",
  "ESTIMATE_APPROVED",
  "PARTS_PENDING",
  "WIP_START",
  "QC_PENDING",
  "QC_FAILED",
  "FINAL_REVIEW",
  "INVOICED",
  "GATE_OUT"
] as const;

export const QueueState = [
  "INTAKE_QUEUE",
  "DIAGNOSTIC_QUEUE",
  "WIP_QUEUE",
  "QC_QUEUE",
  "WASHING_QUEUE",
  "DELIVERY_QUEUE"
] as const;

export const NotificationPriority = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
] as const;

export const DecisionType = [
  "AI_OVERRIDE",
  "QC_OVERRIDE",
  "WARRANTY_BYPASS",
  "ETD_CHANGE",
  "TECH_REASSIGN",
  "ESTIMATE_OVERRIDE"
] as const;

export const QCResult = [
  "PASS",
  "FAIL"
] as const;

export const ApprovalStatus = [
  "PENDING",
  "APPROVED",
  "REJECTED"
] as const;

export const SLAStatus = [
  "WITHIN_SLA",
  "WARN",
  "BREACHED"
] as const;

export const AIRecommendationType = [
  "TECH_ASSIGNMENT",
  "TAT_PREDICTION",
  "QC_CHECK",
  "OVERRIDE_AUDIT"
] as const;

// =============================================================================
// PRESERVED WORKFORCE 1.1 CORE TABLES (MYSQL NATIVE)
// =============================================================================

// Users table (required by cloudsql-setup)
export const users = mysqlTable("users", {
  id: int("user_id").primaryKey().autoincrement(),
  fullName: text("full_name"),
  username: text("username"),
  passwordHash: text("password_hash"),
  role: text("role"),
  employeeId: int("employee_id"),
  isActive: boolean("is_active"),
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
  passwordPlain: text("password_plain"),
  dateOfJoining: text("date_of_joining"),
  dob: text("dob"),
  qualification: text("qualification"),
  designation: text("designation"),
  grade: text("grade"),
  floorTeam: text("floor_team"),
  clericalTeam: text("clerical_team"),
  empId: text("emp_id"),
  aadhaarNo: text("aadhaar_no"),
  mobileNo: text("mobile_no"),
});

// Employees
export const employees = mysqlTable("employees", {
  employee_id: int("employee_id").primaryKey(),
  full_name: text("full_name").notNull(),
  employee_code: text("employee_code").notNull(),
  role: text("role").notNull(),
  employee_grade: text("employee_grade").notNull(),
  basic_salary: int("basic_salary").notNull(),
  mobile: text("mobile").notNull(),
  is_active: boolean("is_active").notNull(),
  created_at: text("created_at"),
  allocated_revenue: int("allocated_revenue"),
  target_revenue: int("target_revenue"),
  paid_pct: text("paid_pct"),
  tml_claim_pct: text("tml_claim_pct"),
  department: text("department"),
  workshop_id: int("workshop_id"),
  shift_id: int("shift_id"),
  joining_date: text("joining_date"),
  profile_photo_url: text("profile_photo_url"),
  face_embedding_reference: text("face_embedding_reference"),
});

// Bays
export const bays = mysqlTable("bays", {
  bay_id: int("bay_id").primaryKey(),
  bay_code: text("bay_code").notNull(),
  bay_name: text("bay_name").notNull(),
  bay_type: text("bay_type").notNull(),
  status: text("status").notNull(),
  is_active: boolean("is_active").notNull(),
});

// SRTypes
export const srTypes = mysqlTable("sr_types", {
  sr_type_id: int("sr_type_id").primaryKey(),
  sr_type_code: text("sr_type_code").notNull(),
  sr_type_name: text("sr_type_name").notNull(),
  default_duration_mins: int("default_duration_mins").notNull(),
  is_active: boolean("is_active").notNull(),
});

// RevenueSplits
export const revenueSplits = mysqlTable("revenue_splits", {
  split_id: int("split_id").primaryKey(),
  combination_code: text("combination_code").notNull(),
  combination_label: text("combination_label").notNull(),
  person_count: int("person_count").notNull(),
  tech_pct: int("tech_pct").notNull(),
  co_tech_pct: int("co_tech_pct").notNull(),
  electrician_pct: int("electrician_pct").notNull(),
  add_tech_pct: int("add_tech_pct").notNull(),
  uses_salary_wt: boolean("uses_salary_wt").notNull(),
  senior_override: boolean("senior_override").notNull(),
  notes: text("notes"),
  is_active: boolean("is_active").notNull(),
});

// JobCards (EXTENDED for WOS v1.0)
export const jobCards = mysqlTable("job_cards", {
  job_id: int("job_id").primaryKey(),
  job_card_no: text("job_card_no").notNull(),
  vrn: text("vrn").notNull(),
  customer_name: text("customer_name").notNull(),
  customer_mobile: text("customer_mobile").notNull(),
  vehicle_make: text("vehicle_make").notNull(),
  vehicle_model: text("vehicle_model").notNull(),
  vehicle_year: int("vehicle_year").notNull(),
  km_reading: int("km_reading").notNull(),
  sr_type_id: int("sr_type_id").notNull(),
  job_description: text("job_description").notNull(),
  priority: text("priority").notNull(),
  bay_id: int("bay_id"),
  status: text("status").notNull(),
  etd: text("etd").notNull(),
  started_at: text("started_at"),
  completed_at: text("completed_at"),
  invoiced_at: text("invoiced_at"),
  created_by: int("created_by").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at"),
  workshop_stage: text("workshop_stage"),
  l1_delay: text("l1_delay"),
  l2_delay: text("l2_delay"),
  l3_delay: text("l3_delay"),
  l5_delay: text("l5_delay"),
  delay_notes: text("delay_notes"),
  time_slot: text("time_slot"),
  tat_status: text("tat_status"),
  pending_reason: text("pending_reason"),
  remarks: text("remarks"),
  date_in: text("date_in"),
  time_in: text("time_in"),
  expected_date_out: text("expected_date_out"),
  expected_time_of_completion: text("expected_time_of_completion"),
  time_out: text("time_out"),
  date_completed: text("date_completed"),
  bay_no: text("bay_no"),
  service_advisor: text("service_advisor"),
  technician_name: text("technician_name"),
  no_of_laborers: int("no_of_laborers"),
  actual_time_taken: text("actual_time_taken"),
  numberplate_photo: text("numberplate_photo"),
  odometer_photo: text("odometer_photo"),
  chassis_number: text("chassis_number"),
  driver_name: text("driver_name"),
  driver_mobile: text("driver_mobile"),
  driver_image: text("driver_image"),
  token_number: text("token_number"),
  waiting_time_mins: int("waiting_time_mins"),
  progress_pct: int("progress_pct"),
  parts_price: int("parts_price"),
  labor_price: int("labor_price"),
  parts_status: text("parts_status"),
  parts_list: text("parts_list"),
  parts_images: text("parts_images"),
  warranty_status: text("warranty_status"),
  payment_method: text("payment_method"),
  payment_reference: text("payment_reference"),
  gate_pass_issued: boolean("gate_pass_issued"),
  exited_at: text("exited_at"),
  invoice_no: text("invoice_no"),
  gate_out_time: text("gate_out_time"),

  // ── APPROVED WOS EXTENSIONS ──────────────────────────────────────────────
  // REQ-04 | Bounded Context: Workshop Operations | Aggregate Root: JobCard
  // Purpose: Flags breakdown or towed-in vehicles for express bay routing.
  // Updated by: Service Advisor (UI Form) or Gate-In Intake API.
  // Read by: Dashboards, Routing Engine.
  emergency_flag: boolean("emergency_flag").default(false),

  // REQ-05 | Bounded Context: Quality Control | Aggregate Root: JobCard
  // Purpose: Tracks cumulative rework loop cycles for First Time Right (FTR) KPI.
  // Updated by: QC Inspector via QC Fail API.
  // Read by: KPI Engine, Foreman Dashboard.
  rework_count: int("rework_count").default(0),

  // REQ-01 | Bounded Context: Workshop Operations | Aggregate Root: JobCard
  // Purpose: Tracks active state in the 12-state workflow machine.
  // Updated by: Status Transition API.
  // Read by: Dashboard, Queue Router.
  current_workflow_state: text("current_workflow_state").default("GATE_IN"),

  // REQ-02 | Bounded Context: Workshop Operations | Aggregate Root: JobCard
  // Purpose: Tracks active routing queue (e.g. DIAGNOSTIC_QUEUE, WIP_QUEUE).
  // Updated by: Queue transition handler API.
  // Read by: Queue UI, Supervisor Dashboard.
  current_queue: text("current_queue"),

  // REQ-06 | Bounded Context: Workshop Operations | Aggregate Root: JobCard
  // Purpose: Tracks active SLA compliance status (WITHIN_SLA, WARN, BREACHED).
  // Updated by: SLA monitor engine cron.
  // Read by: Dashboard, Escalation manager.
  sla_status: text("sla_status").default("WITHIN_SLA"),

  // REQ-07 | Bounded Context: Workshop Operations | Aggregate Root: JobCard
  // Purpose: Tracks active estimated completion time (updated by authorized extensions).
  // Updated by: Advisor request API (approved by manager).
  // Read by: Customer Portal API.
  current_etd: timestamp("current_etd"),
});

// user_access_master table definition
export const userAccessMaster = mysqlTable("user_access_master", {
  user_id: int("user_id").primaryKey().autoincrement(),
  employee_id: int("employee_id"),
  username: text("username"),
  email: text("email"),
  user_role: text("user_role"),
  access_level: int("access_level"),
  is_active: boolean("is_active"),
  created_at: timestamp("created_at"),
  mobile_no: text("mobile_no").notNull(),
  password_hash: text("password_hash"),
  otp_hash: text("otp_hash"),
  otp_expiry: timestamp("otp_expiry"),
});

// role_permissions table definition
export const rolePermissions = mysqlTable("role_permissions", {
  permission_id: int("permission_id").primaryKey().autoincrement(),
  role_name: text("role_name"),
  module_name: text("module_name"),
  can_view: boolean("can_view"),
  can_edit: boolean("can_edit"),
  can_comment: boolean("can_comment"),
  updated_by: int("updated_by"),
  updated_at: timestamp("updated_at").defaultNow(),
});

// fsb_master table definition
export const fsbMaster = mysqlTable("fsb_master", {
  fsb_id: int("fsb_id").primaryKey().autoincrement(),
  job_card_id: int("job_card_id"),
  fsb_status: text("fsb_status"),
});

// Gate Entries table
export const gateEntries = mysqlTable("gate_entries", {
  gate_id: int("gate_id").primaryKey(),
  token_number: text("token_number").notNull(),
  vrn: text("vrn").notNull(),
  vehicle_model: text("vehicle_model").notNull(),
  chassis_number: text("chassis_number").notNull(),
  km_reading: int("km_reading").notNull(),
  driver_name: text("driver_name").notNull(),
  driver_mobile: text("driver_mobile").notNull(),
  driver_image: text("driver_image"),
  waiting_time_mins: int("waiting_time_mins").notNull(),
  status: text("status").notNull(),
  created_at: text("created_at").notNull(),
});

// JobTechnicianMaps
export const jobTechnicianMaps = mysqlTable("job_technician_maps", {
  map_id: int("map_id").primaryKey(),
  job_id: int("job_id").notNull(),
  employee_id: int("employee_id").notNull(),
  tech_role: text("tech_role").notNull(),
  assigned_at: text("assigned_at"),
});

// JobRevenues
export const jobRevenues = mysqlTable("job_revenues", {
  revenue_id: int("revenue_id").primaryKey(),
  job_id: int("job_id").notNull(),
  labour_amount: int("labour_amount").notNull(),
  parts_amount: int("parts_amount").notNull(),
  total_amount: int("total_amount").notNull(),
  split_id: int("split_id").notNull(),
  calculated_at: text("calculated_at"),
});

// JobRevenueSplitDetails
export const jobRevenueSplitDetails = mysqlTable("job_revenue_split_details", {
  detail_id: int("detail_id").primaryKey(),
  revenue_id: int("revenue_id").notNull(),
  employee_id: int("employee_id").notNull(),
  tech_role: text("tech_role").notNull(),
  split_pct: int("split_pct").notNull(),
  split_amount: int("split_amount").notNull(),
});

// CarryForwardLogs
export const carryForwardLogs = mysqlTable("carry_forward_logs", {
  cf_id: int("cf_id").primaryKey(),
  job_id: int("job_id").notNull(),
  cf_reason: text("cf_reason").notNull(),
  raised_by: int("raised_by").notNull(),
  approved_by: int("approved_by"),
  cf_status: text("cf_status").notNull(),
  raised_at: text("raised_at").notNull(),
  actioned_at: text("actioned_at"),
});

// ReworkLogs
export const reworkLogs = mysqlTable("rework_logs", {
  rework_id: int("rework_id").primaryKey(),
  original_job_id: int("original_job_id").notNull(),
  new_job_id: int("new_job_id"),
  rework_reason: text("rework_reason").notNull(),
  original_tech_id: int("original_tech_id").notNull(),
  raised_by: int("raised_by").notNull(),
  approved_by: int("approved_by"),
  rework_status: text("rework_status").notNull(),
  raised_at: text("raised_at").notNull(),
  actioned_at: text("actioned_at"),
});

// AlertConfigs
export const alertConfigs = mysqlTable("alert_configs", {
  alert_config_id: int("alert_config_id").primaryKey(),
  alert_code: text("alert_code").notNull(),
  alert_name: text("alert_name").notNull(),
  alert_category: text("alert_category").notNull(),
  trigger_condition: text("trigger_condition").notNull(),
  threshold_value: int("threshold_value").notNull(),
  threshold_unit: text("threshold_unit").notNull(),
  severity: text("severity").notNull(),
  is_active: boolean("is_active").notNull(),
});

// AlertLogs
export const alertLogs = mysqlTable("alert_logs", {
  alert_id: int("alert_id").primaryKey(),
  alert_config_id: int("alert_config_id").notNull(),
  entity_type: text("entity_type").notNull(),
  entity_id: int("entity_id").notNull(),
  alert_message: text("alert_message").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  acknowledged_by: int("acknowledged_by"),
  acknowledged_at: text("acknowledged_at"),
  resolved_at: text("resolved_at"),
  created_at: text("created_at").notNull(),
});

// DMSImportBatches
export const dmsImportBatches = mysqlTable("dms_import_batches", {
  batch_id: int("batch_id").primaryKey(),
  imported_by: int("imported_by").notNull(),
  file_name: text("file_name").notNull(),
  total_rows: int("total_rows").notNull(),
  matched_rows: int("matched_rows").notNull(),
  unmatched_rows: int("unmatched_rows").notNull(),
  status: text("status").notNull(),
  imported_at: text("imported_at").notNull(),
});

// DMSImportRows
export const dmsImportRows = mysqlTable("dms_import_rows", {
  row_id: int("row_id").primaryKey(),
  batch_id: int("batch_id").notNull(),
  row_number: int("row_number").notNull(),
  vrn: text("vrn").notNull(),
  job_date: text("job_date").notNull(),
  sr_type: text("sr_type").notNull(),
  labour_amount: int("labour_amount").notNull(),
  parts_amount: int("parts_amount").notNull(),
  total_amount: int("total_amount").notNull(),
  matched_job_id: int("matched_job_id"),
  match_status: text("match_status").notNull(),
  conflict_reason: text("conflict_reason"),
  resolved_by: int("resolved_by"),
  resolved_at: text("resolved_at"),
  raw_data: text("raw_data"),
});

// JobRevenueSplit
export const jobRevenueSplit = mysqlTable("job_revenue_split", {
  id: serial("id").primaryKey(),
  job_id: int("job_id").notNull(),
  employee_id: int("employee_id").notNull(),
  allocated_amount: decimal("allocated_amount", { precision: 10, scale: 2 }).notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// TechnicianKpiDaily
export const technicianKpiDaily = mysqlTable("technician_kpi_daily", {
  id: serial("id").primaryKey(),
  employee_id: int("employee_id").notNull(),
  kpi_date: text("kpi_date").notNull(),
  jobs_assigned: int("jobs_assigned").notNull(),
  jobs_completed: int("jobs_completed").notNull(),
  jobs_open: int("jobs_open").notNull(),
  revenue_earned: decimal("revenue_earned", { precision: 10, scale: 2 }).notNull(),
  avg_job_duration: int("avg_job_duration").notNull(),
  completion_efficiency: decimal("completion_efficiency", { precision: 5, scale: 2 }).notNull(),
  utilization_percent: decimal("utilization_percent", { precision: 5, scale: 2 }).notNull(),
  rework_count: int("rework_count").notNull(),
  rework_percent: decimal("rework_percent", { precision: 5, scale: 2 }).notNull(),
  tml_claims: int("tml_claims").notNull(),
  tml_claim_rate: decimal("tml_claim_rate", { precision: 5, scale: 2 }).notNull(),
  avg_revenue_per_job: decimal("avg_revenue_per_job", { precision: 10, scale: 2 }).notNull(),
  on_time_completion: decimal("on_time_completion", { precision: 5, scale: 2 }).notNull(),
  quality_score: decimal("quality_score", { precision: 5, scale: 2 }).notNull(),
  idle_time: int("idle_time").notNull(),
  break_time: int("break_time").notNull(),
  overtime_hours: decimal("overtime_hours", { precision: 5, scale: 2 }).notNull(),
  health_status: text("health_status").notNull(), // 'GREEN' | 'AMBER' | 'RED'
  created_at: timestamp("created_at").defaultNow(),
});

// ProductivityAlerts
export const productivityAlerts = mysqlTable("productivity_alerts", {
  id: serial("id").primaryKey(),
  employee_id: int("employee_id").notNull(),
  alert_type: text("alert_type").notNull(),
  severity: text("severity").notNull(), // 'Low' | 'Medium' | 'High' | 'Critical'
  trigger_value: decimal("trigger_value", { precision: 10, scale: 2 }).notNull(),
  threshold_value: decimal("threshold_value", { precision: 10, scale: 2 }).notNull(),
  alert_message: text("alert_message").notNull(),
  recommended_action: text("recommended_action").notNull(),
  status: text("status").notNull(), // 'Active' | 'Resolved'
  created_at: timestamp("created_at").defaultNow(),
  resolved_at: timestamp("resolved_at"),
});

// ReworkTracking
export const reworkTracking = mysqlTable("rework_tracking", {
  id: serial("id").primaryKey(),
  original_job_id: int("original_job_id").notNull(),
  rework_job_id: int("rework_job_id").notNull(),
  vehicle_reg: text("vehicle_reg").notNull(),
  assigned_technician_id: int("assigned_technician_id").notNull(),
  original_closure_date: timestamp("original_closure_date").notNull(),
  rework_date: timestamp("rework_date").notNull(),
  days_since_original: int("days_since_original").notNull(),
  original_issue: text("original_issue").notNull(),
  rework_reason: text("rework_reason").notNull(),
  rework_completed: boolean("rework_completed").notNull(),
  rework_revenue: decimal("rework_revenue", { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Workshops table
export const workshops = mysqlTable("workshops", {
  workshop_id: int("workshop_id").primaryKey(),
  workshop_name: text("workshop_name").notNull(),
  latitude: decimal("latitude", { precision: 9, scale: 6 }).notNull(),
  longitude: decimal("longitude", { precision: 9, scale: 6 }).notNull(),
  allowed_gps_radius: int("allowed_gps_radius").notNull(),
  is_active: boolean("is_active").notNull(),
});

// Shifts table
export const shifts = mysqlTable("shifts", {
  shift_id: int("shift_id").primaryKey(),
  shift_type: text("shift_type").notNull(),
  start_time: text("start_time").notNull(),
  end_time: text("end_time").notNull(),
  is_active: boolean("is_active").notNull(),
});

// Approval matrices table
export const approvalMatrices = mysqlTable("approval_matrices", {
  matrix_id: int("matrix_id").primaryKey(),
  module_name: text("module_name").notNull(),
  ot_category: text("ot_category").notNull(),
  workshop_id: int("workshop_id").notNull(),
  role_name: text("role_name").notNull(),
  approval_level: int("approval_level").notNull(),
  is_active: boolean("is_active").notNull(),
});

// Overtime requests table
export const overtimeRequests = mysqlTable("overtime_requests", {
  ot_id: int("ot_id").primaryKey(),
  employee_id: int("employee_id").notNull(),
  ot_category: text("ot_category").notNull(),
  date: text("date").notNull(),
  shift_id: int("shift_id").notNull(),
  ot_start_time: text("ot_start_time").notNull(),
  ot_end_time: text("ot_end_time").notNull(),
  total_hours: decimal("total_hours", { precision: 5, scale: 2 }).notNull(),
  benefit_type: text("benefit_type").notNull(),
  ot_reason_category: text("ot_reason_category").notNull(),
  job_card_id: int("job_card_id"),
  workshop_id: int("workshop_id"),
  department: text("department"),
  work_description: text("work_description"),
  comp_attendance_credit_earned: decimal("comp_attendance_credit_earned", { precision: 3, scale: 2 }),
  snapshot_basic_salary: decimal("snapshot_basic_salary", { precision: 12, scale: 2 }),
  snapshot_days_in_month: int("snapshot_days_in_month"),
  hourly_salary_rate: decimal("hourly_salary_rate", { precision: 10, scale: 2 }),
  calculated_amount: decimal("calculated_amount", { precision: 12, scale: 2 }),
  max_allowed_cap: decimal("max_allowed_cap", { precision: 12, scale: 2 }),
  final_payable_amount: decimal("final_payable_amount", { precision: 12, scale: 2 }),
  capping_reason: text("capping_reason"),
  device_name: text("device_name").notNull(),
  operating_system: text("operating_system").notNull(),
  app_version: text("app_version").notNull(),
  ip_address: text("ip_address").notNull(),
  device_time: timestamp("device_time").notNull(),
  server_time: timestamp("server_time").defaultNow(),
  time_difference_seconds: int("time_difference_seconds").notNull(),
  face_verification_provider: text("face_verification_provider"),
  face_match_result: text("face_match_result"),
  face_match_score: decimal("face_match_score", { precision: 4, scale: 3 }),
  face_verification_time: timestamp("face_verification_time"),
  ocr_provider: text("ocr_provider"),
  ocr_confidence: decimal("ocr_confidence", { precision: 4, scale: 3 }),
  ocr_verification_time: timestamp("ocr_verification_time"),
  gps_lat: decimal("gps_lat", { precision: 9, scale: 6 }).notNull(),
  gps_lng: decimal("gps_lng", { precision: 9, scale: 6 }).notNull(),
  gps_matched: boolean("gps_matched").notNull(),
  ai_recommendation_status: text("ai_recommendation_status"),
  ai_flags: text("ai_flags"),
  current_level: int("current_level").notNull(),
  current_status: text("current_status").notNull(),
  payroll_period: text("payroll_period"),
  paid_at: timestamp("paid_at"),
  payment_reference: text("payment_reference"),
  created_by: int("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Overtime attachments table
export const overtimeAttachments = mysqlTable("overtime_attachments", {
  attachment_id: int("attachment_id").primaryKey(),
  ot_id: int("ot_id").notNull(),
  attachment_type: text("attachment_type").notNull(),
  file_path: text("file_path").notNull(),
  uploaded_at: timestamp("uploaded_at").defaultNow(),
});

// Overtime workflow history table
export const overtimeWorkflowHistory = mysqlTable("overtime_workflow_history", {
  history_id: int("history_id").primaryKey(),
  ot_id: int("ot_id").notNull(),
  level: int("level").notNull(),
  approver_id: int("approver_id").notNull(),
  approver_role: text("approver_role").notNull(),
  action_date: text("action_date").notNull(),
  action_time: text("action_time").notNull(),
  decision: text("decision").notNull(),
  remarks: text("remarks"),
});

// Overtime API logs table
export const overtimeApiLogs = mysqlTable("overtime_api_logs", {
  log_id: int("log_id").primaryKey(),
  request_id: text("request_id").notNull(),
  user_id: int("user_id"),
  api_endpoint: text("api_endpoint").notNull(),
  ip_address: text("ip_address").notNull(),
  device_info: text("device_info").notNull(),
  execution_duration_ms: int("execution_duration_ms").notNull(),
  response_status: int("response_status").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Overtime audit logs table
export const overtimeAuditLogs = mysqlTable("overtime_audit_logs", {
  log_id: int("log_id").primaryKey(),
  ot_id: int("ot_id").notNull(),
  action: text("action").notNull(),
  actor_id: int("actor_id").notNull(),
  actor_role: text("actor_role").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  ip_address: text("ip_address").notNull(),
  payload_diff: text("payload_diff").notNull(),
});

// =============================================================================
// WOS SCHEMA EXTENSIONS (Architecture v1.0 – Frozen)
// =============================================================================

// ── tbl_audit_trail ─────────────────────────────────────────────────────────
// REQ-10 | Bounded Context: Auditing & Security
// Aggregate Root: N/A (Cross-cutting concern – append-only event store)
// Workflow Step: Every state transition across all 12 workflow states
// Business Owner: Security & Compliance
// Workflow Reference: Auditing Spec §2
// FDS Reference: 07_Database_Transaction_Map
// DDD Reference: DDD_Domain_Events
// Power BI Usage: Power BI Compliance reporting & timeline logs
// AI Usage: Analyzes transition profiles to recommend queue improvements
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Immutable, append-only log capturing every user action and state
//   diff in the system. Logged automatically by server middleware.
// ─────────────────────────────────────────────────────────────────────────────
export const tblAuditTrail = mysqlTable("tbl_audit_trail", {
  // Purpose: Unique incrementing identifier for audit trail records.
  audit_id: serial("audit_id").primaryKey(),

  // Purpose: Context trace to validate ETL sync pipelines.
  validation_run_id: text("validation_run_id"),

  // Purpose: ID referencing the specific browser/client API session.
  session_id: text("session_id"),

  // Purpose: References the user ID performing the action.
  user_id: int("user_id"),

  // Purpose: Target polymorphic entity classifications (e.g. 'job_cards').
  entity_type: text("entity_type").notNull(),
  entity_id: int("entity_id").notNull(),

  // Purpose: Log action key (e.g., 'STATUS_CHANGE', 'RECORD_CREATE').
  action_code: text("action_code").notNull(),

  // Purpose: Before and after payload differences in JSON string format.
  payload_diff: text("payload_diff"),

  // Purpose: Caller client IP address.
  ip_address: text("ip_address"),

  // Purpose: Creation timestamp.
  created_at: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_entity").on(table.entity_type, table.entity_id),
  index("idx_audit_timestamp").on(table.created_at),
]);

// ── rpt_qc_checklists ──────────────────────────────────────────────────────
// REQ-05 | Bounded Context: Quality Control
// Aggregate Root: JobCard (child entity of QC inspection)
// Workflow Step: T06 QC Inspection (QC_PENDING → PASS/FAIL)
// Business Owner: QC Supervisor
// Workflow Reference: QC Rules §3
// FDS Reference: 03_Workflow_FDS
// DDD Reference: DDD_Aggregates
// Power BI Usage: First Time Right (FTR) KPI dashboard reporting
// AI Usage: Correlates check items with parts fail probabilities
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Stores road test outcomes and multi-point checks checklist details.
// ─────────────────────────────────────────────────────────────────────────────
export const rptQcChecklists = mysqlTable("rpt_qc_checklists", {
  qc_checklist_id: serial("qc_checklist_id").primaryKey(),
  
  // Purpose: References target job card.
  job_id: int("job_id").notNull(),

  // Purpose: References checking inspector employee ID.
  inspector_id: int("inspector_id").notNull(),

  // Purpose: Quality check result: 'PASS' or 'FAIL'.
  result: text("result").notNull(),

  // Purpose: Checklist checklist items parameters in JSON.
  check_items_json: text("check_items_json"),

  // Purpose: Road testing mileage counter.
  road_test_km: int("road_test_km"),

  // Purpose: Road test feedback remarks (mandatory on FAIL).
  inspector_notes: text("inspector_notes"),

  created_at: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_qc_job").on(table.job_id),
  index("idx_qc_results").on(table.result, table.job_id),
]);

// ── rpt_digital_approvals ───────────────────────────────────────────────────
// REQ-03 | Bounded Context: Customer Management / JobCard
// Aggregate Root: JobCard (child entity of estimate approval)
// Workflow Step: T03 Estimate Approval (ESTIMATE_PENDING → ESTIMATE_APPROVED)
// Business Owner: Customer Relations / Finance
// Workflow Reference: Estimate Approvals Spec §1
// FDS Reference: 01_Screen_FDS
// DDD Reference: DDD_Value_Objects
// Power BI Usage: Estimate conversion rate analysis & TAT latency
// AI Usage: Evaluates approval velocity to predict payment issues
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Records digital authorizations, signature links, and OTP records.
// ─────────────────────────────────────────────────────────────────────────────
export const rptDigitalApprovals = mysqlTable("rpt_digital_approvals", {
  approval_id: serial("approval_id").primaryKey(),

  // Purpose: References target job card.
  job_id: int("job_id").notNull(),

  // Purpose: Signature file cloud path link.
  signature_url: text("signature_url"),

  // Purpose: Method selected: 'SIGNATURE_PAD', 'OTP', 'WHATSAPP'.
  approval_method: text("approval_method").notNull(),

  // Purpose: SHA-256 OTP verification code.
  otp_hash: text("otp_hash"),

  // Purpose: Version of estimate.
  estimate_version: int("estimate_version").default(1),

  // Purpose: Total amount customer consented to in estimate.
  approved_amount: decimal("approved_amount", { precision: 12, scale: 2 }),

  // Purpose: User capturing the digital signature.
  captured_by: int("captured_by"),

  created_at: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_approvals_job").on(table.job_id),
  index("idx_approvals_method").on(table.job_id, table.approval_method),
]);

// ── dim_certifications ──────────────────────────────────────────────────────
// Bounded Context: Technician Management
// Aggregate Root: Employee (child entity)
// Workflow Step: T04 WIP Start assignment qualification verify
// Business Owner: HR / Training
// Workflow Reference: Staff Qualifications Spec §1
// FDS Reference: 04_Role_FDS
// DDD Reference: DDD_Entities
// Power BI Usage: Technician Skill matrix metrics
// AI Usage: Enforces qualified tech recommendation matching
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Reference lookup of technical qualification capabilities.
// ─────────────────────────────────────────────────────────────────────────────
export const dimCertifications = mysqlTable("dim_certifications", {
  cert_id: serial("cert_id").primaryKey(),

  // Purpose: References target employee.
  employee_id: int("employee_id").notNull(),

  // Purpose: Name of training skill/certification.
  certification_name: text("certification_name").notNull(),

  // Purpose: Certifying institute.
  issuing_authority: text("issuing_authority"),

  // Purpose: Date qualification was achieved.
  certified_on: timestamp("certified_on"),

  // Purpose: Expiration date.
  valid_until: timestamp("valid_until"),

  is_active: boolean("is_active").default(true),
}, (table) => [
  index("idx_certs_employee").on(table.employee_id),
]);

// ── tbl_notifications ───────────────────────────────────────────────────────
// REQ-09 | Bounded Context: Notifications
// Aggregate Root: N/A (Cross-cutting concern)
// Workflow Step: Every SLA breach escalation (E01–E08)
// Business Owner: Customer Service / Operations
// Workflow Reference: Notification Matrix §6
// FDS Reference: 06_API_Requirements
// DDD Reference: DDD_Domain_Events
// Power BI Usage: SLA Alert escalation stats & read frequency
// AI Usage: Predicts message effectiveness and click latency
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Unified repository of SMS queue records, alerts, and system warnings.
// ─────────────────────────────────────────────────────────────────────────────
export const tblNotifications = mysqlTable("tbl_notifications", {
  notification_id: serial("notification_id").primaryKey(),

  // Purpose: References targeted recipient.
  user_id: int("user_id").notNull(),

  // Purpose: Message category (e.g. 'SLA_BREACH', 'QC_FAILED').
  notification_type: text("notification_type"),

  // Purpose: Notification body message content.
  message: text("message").notNull(),

  // Purpose: Alert priority level: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'.
  priority: text("priority").notNull().default("MEDIUM"),

  // Purpose: Notification status read toggle.
  is_read: boolean("is_read").default(false),

  // Purpose: Link referencing specific active Job Card.
  related_job_id: int("related_job_id"),

  // Purpose: Deep-link URL for redirect.
  action_url: text("action_url"),

  created_at: timestamp("created_at").defaultNow(),
  read_at: timestamp("read_at"),
}, (table) => [
  index("idx_notifications_user").on(table.user_id, table.is_read),
]);

// ── tbl_decision_log ────────────────────────────────────────────────────────
// REQ-11 | Bounded Context: Operations / Override Management
// Aggregate Root: JobCard (decisions target job card)
// Workflow Step: Any override action (AI override, QC override, SLA bypass)
// Business Owner: Workshop Director
// Workflow Reference: Override Matrix §2
// FDS Reference: Decision_Log_Review
// DDD Reference: DDD_Aggregates
// Power BI Usage: SLA resets and manager override metrics
// AI Usage: Analyzes override characteristics to flag anomalies
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Audits supervisor actions, AI recommendation bypasses, and SLA resets.
// ─────────────────────────────────────────────────────────────────────────────
export const tblDecisionLog = mysqlTable("tbl_decision_log", {
  decision_id: serial("decision_id").primaryKey(),

  // Purpose: Target job card ID.
  job_id: int("job_id").notNull(),

  // Purpose: Decision classification (e.g. 'AI_OVERRIDE', 'QC_OVERRIDE').
  decision_type: text("decision_type").notNull(),

  // Purpose: Polymorphic entity reference type.
  entity_type: text("entity_type").notNull().default("job_card"),

  // Purpose: Polymorphic entity record ID.
  entity_id: int("entity_id").notNull(),

  // Purpose: Values suggested by AI models.
  ai_recommended_value: text("ai_recommended_value"),

  // Purpose: Value actually input by manager.
  actual_selected_value: text("actual_selected_value").notNull(),

  // Purpose: Override toggle confirmation.
  override_flag: boolean("override_flag").default(false),

  // Purpose: System reason code.
  reason_code: text("reason_code").notNull(),

  // Purpose: Written explanation/justification details.
  justification: text("justification").notNull(),

  // Purpose: User employee ID who signed off override.
  actor_id: int("actor_id").notNull(),

  created_at: timestamp("created_at").defaultNow(),

  // Purpose: Override outcome status.
  outcome: text("outcome"),

  // Purpose: Confidence rating of recommendation.
  confidence_score: decimal("confidence_score", { precision: 4, scale: 3 }),
}, (table) => [
  index("idx_decision_job").on(table.job_id),
  index("idx_decision_type").on(table.decision_type),
]);

// ── tbl_validation_run ──────────────────────────────────────────────────────
// Bounded Context: ETL & Data Quality
// Aggregate Root: N/A (ETL infrastructure)
// Workflow Step: Pre-deployment data pipeline integrity validation
// Business Owner: Data Operations / IT
// Workflow Reference: Validation rules §1
// FDS Reference: 08_Validation_Rules
// DDD Reference: DDD_Bounded_Contexts
// Power BI Usage: ETL Pipeline validation scorecards
// AI Usage: Detects historical validation error drift patterns
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Tracks integrity checking batch runs and validation status.
// ─────────────────────────────────────────────────────────────────────────────
export const tblValidationRun = mysqlTable("tbl_validation_run", {
  run_id: serial("run_id").primaryKey(),

  // Purpose: Distinct run key identifier.
  validation_run_id: text("validation_run_id").notNull(),

  dwip_version: text("dwip_version"),
  etl_version: text("etl_version"),
  schema_version: text("schema_version"),
  config_version: text("config_version"),
  git_commit_hash: text("git_commit_hash"),

  // Purpose: Result status: 'PASS', 'FAIL'.
  result: text("result").notNull(),

  total_checks: int("total_checks").default(0),
  passed_checks: int("passed_checks").default(0),
  failed_checks: int("failed_checks").default(0),
  summary_json: text("summary_json"),

  // Purpose: System user who scheduled validation run.
  executed_by: int("executed_by"),

  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_validation_run_id").on(table.validation_run_id),
]);

// ── tbl_workflow_history ────────────────────────────────────────────────────
// REQ-08 | Bounded Context: Workshop Operations / Workflow Management
// Aggregate Root: JobCard (history details belong to Job Card)
// Workflow Step: Traces all transitions between 12 workflow states
// Business Owner: Workshop Foreman / Operations
// Workflow Reference: Business Workflow Spec §1
// FDS Reference: 03_Workflow_FDS
// DDD Reference: DDD_Domain_Events
// Power BI Usage: Detailed stage transition cycle times & wait time bottlenecks
// AI Usage: Learns transition rates to predict repair times
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Detailed audit trail tracking every step, queue, and duration.
// ─────────────────────────────────────────────────────────────────────────────
export const tblWorkflowHistory = mysqlTable("tbl_workflow_history", {
  history_id: serial("history_id").primaryKey(),

  // Purpose: References target job card.
  job_id: int("job_id").notNull(),

  // Purpose: Previous workflow state.
  old_state: text("old_state"),

  // Purpose: Active workflow state transitioned to.
  new_state: text("new_state").notNull(),

  // Purpose: Queue assigned (e.g. 'WIP_QUEUE').
  queue: text("queue"),

  // Purpose: SLA status at time of transition.
  sla_status: text("sla_status"),

  // Purpose: Current ETD at time of transition.
  etd: timestamp("etd"),

  // Purpose: User triggering the transition.
  transition_by: int("transition_by"),

  // Purpose: Event timestamp.
  transition_time: timestamp("transition_time").defaultNow(),

  // Purpose: Time spent in seconds in old state before transition.
  duration: int("duration"),

  // Purpose: Supervisor explanation reason notes.
  reason: text("reason"),
}, (table) => [
  index("idx_workflow_history_job").on(table.job_id),
  index("idx_workflow_history_states").on(table.new_state, table.old_state),
]);
