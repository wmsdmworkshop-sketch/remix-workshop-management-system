import { mysqlTable, serial, text, int, boolean, timestamp, decimal, index, uniqueIndex, bigint, varchar, primaryKey } from "drizzle-orm/mysql-core";

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

// Roles master table
export const roles = mysqlTable("roles", {
  role_id: int("role_id").primaryKey().autoincrement(),
  role_name: text("role_name").notNull(),
  permission_level: text("permission_level").notNull(),
});

// Modules master table
export const modules = mysqlTable("modules", {
  module_id: int("module_id").primaryKey().autoincrement(),
  module_name: text("module_name").notNull(),
});

// Users table (required by cloudsql-setup)
export const users = mysqlTable("users", {
  id: int("user_id").primaryKey().autoincrement(),
  fullName: text("full_name"),
  username: text("username"),
  passwordHash: text("password_hash"),
  role: text("role"),
  roleId: int("role_id").notNull(),
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

// Role Permissions Table
export const rolePermissions = mysqlTable("role_permissions", {
  permission_id: int("permission_id").primaryKey().autoincrement(),
  role_id: int("role_id").notNull(),
  module_id: int("module_id").notNull(),
  can_view: boolean("can_view"),
  can_create: boolean("can_create"),
  can_edit: boolean("can_edit"),
  can_delete: boolean("can_delete"),
  can_approve: boolean("can_approve"),
  can_reject: boolean("can_reject"),
  can_print: boolean("can_print"),
  can_export: boolean("can_export"),
  can_import: boolean("can_import"),
  can_assign: boolean("can_assign"),
  can_close: boolean("can_close"),
  can_reopen: boolean("can_reopen"),
  can_admin: boolean("can_admin"),
  can_configure: boolean("can_configure"),
  updated_by: int("updated_by"),
  updated_at: timestamp("updated_at").defaultNow(),
});

// User Overrides Table (ASS-2A)
export const userOverrides = mysqlTable("user_overrides", {
  override_id: int("override_id").primaryKey().autoincrement(),
  user_id: int("user_id").notNull(),
  module_id: int("module_id").notNull(),
  permission_type: text("permission_type").notNull(),
  is_allowed: boolean("is_allowed").notNull(),
  effective_from: timestamp("effective_from"),
  effective_until: timestamp("effective_until"),
  business_reason: text("business_reason").notNull(),
  approved_by: int("approved_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// User Delegations Table (ASS-2A)
export const userDelegations = mysqlTable("user_delegations", {
  delegation_id: int("delegation_id").primaryKey().autoincrement(),
  delegator_id: int("delegator_id").notNull(),
  delegatee_id: int("delegatee_id").notNull(),
  module_id: int("module_id"), // NULL means "All Modules"
  effective_from: timestamp("effective_from").notNull(),
  effective_until: timestamp("effective_until").notNull(),
  business_reason: text("business_reason").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Security Audit Logs Table (ASS-2A)
export const securityAuditLogs = mysqlTable("security_audit_logs", {
  log_id: int("log_id").primaryKey().autoincrement(),
  actor_user_id: int("actor_user_id").notNull(),
  module_name: text("module_name").notNull(),
  feature_name: text("feature_name"),
  action_type: text("action_type").notNull(),
  old_value: text("old_value"),
  new_value: text("new_value"),
  business_reason: text("business_reason").notNull(),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  session_id: text("session_id"),
  request_id: text("request_id"),
  timestamp_utc: timestamp("timestamp_utc").defaultNow(),
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
  email: text("email"),
  record_status: text("record_status"),
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
  crm_job_card_no: text("crm_job_card_no"),
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

  // ── Extended Operational Event Store Fields ──
  event_id: text("event_id"),
  correlation_id: text("correlation_id"),
  parent_event_id: text("parent_event_id"),
  sequence_number: int("sequence_number"),
  source_system: text("source_system"),
  event_version: text("event_version"),
  event_status: text("event_status"),
  event_category: text("event_category"),
  source: text("source"),
  event_type: text("event_type"),
  user: text("user"),
  role: text("role"),
  workshop_id: int("workshop_id"),
  payload: text("payload"),
}, (table) => [
  index("idx_workflow_history_job").on(table.job_id),
  index("idx_workflow_history_states").on(table.new_state, table.old_state),
]);

export const approvalRequests = mysqlTable("approval_requests", {
  approval_request_id: varchar("approval_request_id", { length: 36 }).primaryKey(),
  entity_type: varchar("entity_type", { length: 50 }).notNull(),
  entity_id: varchar("entity_id", { length: 50 }).notNull(),
  workflow_type: varchar("workflow_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  strategy: varchar("strategy", { length: 20 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const approvalDecisions = mysqlTable("approval_decisions", {
  decision_id: varchar("decision_id", { length: 36 }).primaryKey(),
  approval_request_id: varchar("approval_request_id", { length: 36 }).notNull(),
  actor_id: varchar("actor_id", { length: 50 }).notNull(),
  actor_role: varchar("actor_role", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  comments: text("comments"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const approvalDelegations = mysqlTable("approval_delegations", {
  delegation_id: varchar("delegation_id", { length: 36 }).primaryKey(),
  approval_request_id: varchar("approval_request_id", { length: 36 }).notNull(),
  from_actor_id: varchar("from_actor_id", { length: 50 }).notNull(),
  to_actor_id: varchar("to_actor_id", { length: 50 }).notNull(),
  to_actor_role: varchar("to_actor_role", { length: 50 }).notNull(),
  reason: text("reason"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const approvalSteps = mysqlTable("approval_steps", {
  step_id: varchar("step_id", { length: 50 }).notNull(),
  approval_request_id: varchar("approval_request_id", { length: 36 }).notNull(),
  allowed_roles: text("allowed_roles").notNull(),
  is_mandatory: boolean("is_mandatory").notNull().default(true),
  sla_minutes: int("sla_minutes"),
}, (table) => [
  primaryKey({ columns: [table.step_id, table.approval_request_id] })
]);

// =============================================================================
// SPRINT 5: ENTERPRISE NOTIFICATION ENGINE & OUTBOX
// =============================================================================

export const tblEventOutbox = mysqlTable("tbl_event_outbox", {
  event_id: varchar("event_id", { length: 50 }).primaryKey(),
  topic: text("topic").notNull(),
  payload: text("payload").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  retry_count: int("retry_count").notNull().default(0),
  created_at: timestamp("created_at").defaultNow(),
  processed_at: timestamp("processed_at"),
});

export const tblNotificationTemplates = mysqlTable("tbl_notification_templates", {
  template_code: varchar("template_code", { length: 100 }).primaryKey(),
  version: int("version").notNull().default(1),
  channel: varchar("channel", { length: 20 }).notNull(),
  language: varchar("language", { length: 10 }).notNull().default("en"),
  subject_template: text("subject_template").notNull(),
  body_template: text("body_template").notNull(),
  variables: text("variables"),
  is_active: boolean("is_active").notNull().default(true),
});

export const tblNotificationDispatch = mysqlTable("tbl_notification_dispatch", {
  dispatch_id: varchar("dispatch_id", { length: 50 }).primaryKey(),
  event_id: varchar("event_id", { length: 50 }),
  correlation_id: varchar("correlation_id", { length: 50 }),
  recipient: varchar("recipient", { length: 100 }).notNull(),
  template_code: varchar("template_code", { length: 100 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("CREATED"),
  created_at: timestamp("created_at").defaultNow(),
});

export const tblNotificationDelivery = mysqlTable("tbl_notification_delivery", {
  delivery_id: varchar("delivery_id", { length: 50 }).primaryKey(),
  dispatch_id: varchar("dispatch_id", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  attempt_number: int("attempt_number").notNull().default(1),
  provider_response: text("provider_response"),
  sent_at: timestamp("sent_at").defaultNow(),
  delivered_at: timestamp("delivered_at"),
});

export const tblNotificationRead = mysqlTable("tbl_notification_read", {
  dispatch_id: varchar("dispatch_id", { length: 50 }).notNull(),
  user_id: varchar("user_id", { length: 50 }).notNull(),
  read_at: timestamp("read_at").defaultNow(),
  acknowledged: boolean("acknowledged").notNull().default(false),
}, (table) => [
  primaryKey({ columns: [table.dispatch_id, table.user_id] })
]);

export const tblNotificationPreferences = mysqlTable("tbl_notification_preferences", {
  user_id: varchar("user_id", { length: 50 }).primaryKey(),
  preferences_json: text("preferences_json").notNull(),
});

export const tblBusinessCalendar = mysqlTable("tbl_business_calendar", {
  calendar_id: varchar("calendar_id", { length: 50 }).primaryKey(),
  workshop_id: int("workshop_id"), // Null means global
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  is_working_day: boolean("is_working_day").notNull().default(true),
  shift_start_time: varchar("shift_start_time", { length: 8 }).notNull(), // HH:MM:SS
  shift_end_time: varchar("shift_end_time", { length: 8 }).notNull(), // HH:MM:SS
  holiday_reason: text("holiday_reason"),
});

export const tblSlaPolicy = mysqlTable("tbl_sla_policy", {
  policy_id: varchar("policy_id", { length: 50 }).primaryKey(),
  policy_name: varchar("policy_name", { length: 100 }).notNull(),
  sla_type: varchar("sla_type", { length: 50 }).notNull(), // e.g. QC_DELAY, CUSTOMER_APPROVAL_DELAY
  
  // Configuration Matchers (Null = Any)
  workshop_id: int("workshop_id"),
  service_type: varchar("service_type", { length: 50 }),
  customer_category: varchar("customer_category", { length: 50 }), // VIP, Fleet, Regular
  vehicle_category: varchar("vehicle_category", { length: 50 }), // LCV, HCV, Passenger
  operation_type: varchar("operation_type", { length: 50 }), // Warranty, AMC, FSB, Goodwill, Breakdown
  
  // Policy values
  base_minutes_limit: int("base_minutes_limit").notNull(),
  is_24x7: boolean("is_24x7").notNull().default(false),
  is_active: boolean("is_active").notNull().default(true),
});

export const tblSlaInstance = mysqlTable("tbl_sla_instance", {
  instance_id: varchar("instance_id", { length: 50 }).primaryKey(),
  policy_id: varchar("policy_id", { length: 50 }).notNull(),
  entity_type: varchar("entity_type", { length: 50 }).notNull(), // e.g., JOB_CARD
  entity_id: varchar("entity_id", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // RUNNING, PAUSED, RESOLVED, BREACHED
  created_at: timestamp("created_at").defaultNow(),
  resolved_at: timestamp("resolved_at"),
});

export const tblSlaTimer = mysqlTable("tbl_sla_timer", {
  timer_id: varchar("timer_id", { length: 50 }).primaryKey(),
  instance_id: varchar("instance_id", { length: 50 }).notNull(),
  start_time: timestamp("start_time").notNull(),
  target_breach_time: timestamp("target_breach_time").notNull(),
  paused_at: timestamp("paused_at"),
  accumulated_pause_ms: int("accumulated_pause_ms").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull(), // RUNNING, PAUSED, STOPPED
});

export const tblSlaEscalation = mysqlTable("tbl_sla_escalation", {
  escalation_id: varchar("escalation_id", { length: 50 }).primaryKey(),
  policy_id: varchar("policy_id", { length: 50 }).notNull(),
  escalation_level: int("escalation_level").notNull(), // 1 for L1, 2 for L2, etc.
  trigger_minutes_after_breach: int("trigger_minutes_after_breach").notNull().default(0), // 0 = exactly at breach
  target_role: varchar("target_role", { length: 50 }).notNull(), // e.g. L1_SUPERVISOR
  severity: varchar("severity", { length: 20 }).notNull(), // WARNING, CRITICAL, EMERGENCY
});

export const tblSlaHistory = mysqlTable("tbl_sla_history", {
  history_id: varchar("history_id", { length: 50 }).primaryKey(),
  instance_id: varchar("instance_id", { length: 50 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // STARTED, PAUSED, BREACHED, ESCALATED, RESOLVED
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// -------------------------------------------------------------------
// WOS WARRANTY MANAGEMENT (SPRINT 7)
// -------------------------------------------------------------------

export const tbl_warranty_coverage_rules = mysqlTable('tbl_warranty_coverage_rules', {
  rule_id: varchar('rule_id', { length: 50 }).primaryKey(),
  operation_type: varchar('operation_type', { length: 50 }).notNull(), // Warranty, AMC, FSB, Goodwill, Campaign
  min_age_months: int('min_age_months').default(0),
  max_age_months: int('max_age_months'),
  min_mileage: int('min_mileage').default(0),
  max_mileage: int('max_mileage'),
  is_active: int('is_active').default(1),
});

export const tbl_warranty_claims = mysqlTable('tbl_warranty_claims', {
  claim_id: varchar('claim_id', { length: 50 }).primaryKey(),
  job_id: int('job_id').notNull(),
  vin: varchar('vin', { length: 50 }).notNull(),
  operation_type: varchar('operation_type', { length: 50 }).notNull(),
  workflow_state: varchar('workflow_state', { length: 50 }).default('CLAIM_CREATED'),
  total_claimed_amount: decimal('total_claimed_amount', { precision: 10, scale: 2 }),
  total_approved_amount: decimal('total_approved_amount', { precision: 10, scale: 2 }),
  oem_claim_reference: varchar('oem_claim_reference', { length: 100 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const tbl_warranty_claim_lines = mysqlTable('tbl_warranty_claim_lines', {
  line_id: varchar('line_id', { length: 50 }).primaryKey(),
  claim_id: varchar('claim_id', { length: 50 }).notNull(),
  line_type: varchar('line_type', { length: 20 }).notNull(), // PARTS, LABOUR, SUBLET
  item_code: varchar('item_code', { length: 50 }).notNull(),
  quantity: int('quantity').default(1),
  unit_price: decimal('unit_price', { precision: 10, scale: 2 }),
  claimed_amount: decimal('claimed_amount', { precision: 10, scale: 2 }),
  approved_amount: decimal('approved_amount', { precision: 10, scale: 2 }),
  rejection_reason: varchar('rejection_reason', { length: 255 }),
});

export const tbl_warranty_oem_responses = mysqlTable('tbl_warranty_oem_responses', {
  response_id: varchar('response_id', { length: 50 }).primaryKey(),
  claim_id: varchar('claim_id', { length: 50 }).notNull(),
  status_code: varchar('status_code', { length: 50 }),
  raw_payload: text('raw_payload'),
  received_at: timestamp('received_at').defaultNow(),
});

export const tbl_warranty_attachments = mysqlTable('tbl_warranty_attachments', {
  attachment_id: varchar('attachment_id', { length: 50 }).primaryKey(),
  claim_id: varchar('claim_id', { length: 50 }).notNull(),
  file_url: varchar('file_url', { length: 255 }).notNull(),
  document_type: varchar('document_type', { length: 50 }),
});

export const tbl_warranty_settlement = mysqlTable('tbl_warranty_settlement', {
  settlement_id: varchar('settlement_id', { length: 50 }).primaryKey(),
  claim_id: varchar('claim_id', { length: 50 }).notNull(),
  settled_amount: decimal('settled_amount', { precision: 10, scale: 2 }),
  settled_at: timestamp('settled_at').defaultNow(),
});

export const tbl_warranty_history = mysqlTable('tbl_warranty_history', {
  history_id: varchar('history_id', { length: 50 }).primaryKey(),
  claim_id: varchar('claim_id', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// -------------------------------------------------------------------
// WOS AMC MANAGEMENT (SPRINT 8)
// -------------------------------------------------------------------

export const tbl_amc_product = mysqlTable('tbl_amc_product', {
  product_id: varchar('product_id', { length: 50 }).primaryKey(),
  product_name: varchar('product_name', { length: 100 }).notNull(),
  base_price: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  duration_months: int('duration_months').notNull(),
  km_limit: int('km_limit').notNull(),
  service_count_limit: int('service_count_limit').notNull(),
  is_active: int('is_active').default(1)
});

export const tbl_amc_contract = mysqlTable('tbl_amc_contract', {
  contract_id: varchar('contract_id', { length: 50 }).primaryKey(),
  product_id: varchar('product_id', { length: 50 }).notNull(),
  customer_id: varchar('customer_id', { length: 50 }).notNull(),
  contract_type: varchar('contract_type', { length: 50 }).notNull(), // Individual, Fleet
  start_date: timestamp('start_date').notNull(),
  expiry_date: timestamp('expiry_date').notNull(),
  workflow_state: varchar('workflow_state', { length: 50 }).default('DRAFT'),
  payment_status: varchar('payment_status', { length: 50 }).default('PENDING'),
  total_value: decimal('total_value', { precision: 10, scale: 2 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

export const tbl_amc_contract_vehicles = mysqlTable('tbl_amc_contract_vehicles', {
  mapping_id: varchar('mapping_id', { length: 50 }).primaryKey(),
  contract_id: varchar('contract_id', { length: 50 }).notNull(),
  vin: varchar('vin', { length: 50 }).notNull(),
  is_active: int('is_active').default(1)
});

export const tbl_amc_coverage = mysqlTable('tbl_amc_coverage', {
  coverage_id: varchar('coverage_id', { length: 50 }).primaryKey(),
  product_id: varchar('product_id', { length: 50 }).notNull(),
  item_type: varchar('item_type', { length: 50 }).notNull(), // LABOUR, PARTS, CONSUMABLES, SPECIFIC_PART
  item_code: varchar('item_code', { length: 50 }),
  coverage_percentage: decimal('coverage_percentage', { precision: 5, scale: 2 }).notNull(), // 0 to 100
  is_active: int('is_active').default(1)
});

export const tbl_amc_consumption_ledger = mysqlTable('tbl_amc_consumption_ledger', {
  ledger_id: varchar('ledger_id', { length: 50 }).primaryKey(),
  contract_id: varchar('contract_id', { length: 50 }).notNull(),
  vin: varchar('vin', { length: 50 }).notNull(),
  job_id: int('job_id').notNull(),
  transaction_type: varchar('transaction_type', { length: 50 }).notNull(), // DEBIT_SERVICE, DEBIT_AMOUNT
  amount: decimal('amount', { precision: 10, scale: 2 }),
  service_count: int('service_count'),
  km_reading: int('km_reading'),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow()
});

export const tbl_amc_claim = mysqlTable('tbl_amc_claim', {
  claim_id: varchar('claim_id', { length: 50 }).primaryKey(),
  contract_id: varchar('contract_id', { length: 50 }).notNull(),
  job_id: int('job_id').notNull(),
  total_claim_amount: decimal('total_claim_amount', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 50 }).default('PENDING'),
  created_at: timestamp('created_at').defaultNow()
});

export const tbl_amc_claim_line = mysqlTable('tbl_amc_claim_line', {
  line_id: varchar('line_id', { length: 50 }).primaryKey(),
  claim_id: varchar('claim_id', { length: 50 }).notNull(),
  item_type: varchar('item_type', { length: 50 }).notNull(),
  item_code: varchar('item_code', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  coverage_applied: decimal('coverage_applied', { precision: 5, scale: 2 }),
  customer_share: decimal('customer_share', { precision: 10, scale: 2 }),
  provider_share: decimal('provider_share', { precision: 10, scale: 2 })
});

export const tbl_amc_history = mysqlTable('tbl_amc_history', {
  history_id: varchar('history_id', { length: 50 }).primaryKey(),
  contract_id: varchar('contract_id', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow()
});

// -------------------------------------------------------------------
// WOS FSB & GOODWILL MANAGEMENT (SPRINT 9)
// -------------------------------------------------------------------

export const tbl_fsb_campaign = mysqlTable('tbl_fsb_campaign', {
  campaign_id: varchar('campaign_id', { length: 50 }).primaryKey(),
  oem_campaign_number: varchar('oem_campaign_number', { length: 50 }),
  campaign_name: varchar('campaign_name', { length: 255 }).notNull(),
  campaign_type: varchar('campaign_type', { length: 50 }).notNull(), // Safety, Emission, Quality, Software, Mechanical, Electrical
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date'),
  priority: varchar('priority', { length: 50 }).default('MEDIUM'),
  status: varchar('status', { length: 50 }).default('ACTIVE'),
  description: text('description'),
  applicable_vehicle_categories: text('applicable_vehicle_categories'),
  applicable_models: text('applicable_models'),
  applicable_engine_families: text('applicable_engine_families'),
  is_active: int('is_active').default(1),
  created_at: timestamp('created_at').defaultNow()
});

export const tbl_fsb_vehicle_eligibility = mysqlTable('tbl_fsb_vehicle_eligibility', {
  eligibility_id: varchar('eligibility_id', { length: 50 }).primaryKey(),
  campaign_id: varchar('campaign_id', { length: 50 }).notNull(),
  vin: varchar('vin', { length: 50 }).notNull(),
  engine_number: varchar('engine_number', { length: 50 }),
  chassis_number: varchar('chassis_number', { length: 50 }),
  eligibility_status: varchar('eligibility_status', { length: 50 }).default('ELIGIBLE'), // ELIGIBLE, COMPLETED, EXPIRED, NOT_APPLICABLE
  reason: text('reason'),
  validated_date: timestamp('validated_date').defaultNow()
});

export const tbl_fsb_execution = mysqlTable('tbl_fsb_execution', {
  execution_id: varchar('execution_id', { length: 50 }).primaryKey(),
  campaign_id: varchar('campaign_id', { length: 50 }).notNull(),
  job_id: int('job_id').notNull(),
  vin: varchar('vin', { length: 50 }).notNull(),
  technician_id: varchar('technician_id', { length: 50 }),
  workshop_id: varchar('workshop_id', { length: 50 }),
  execution_status: varchar('execution_status', { length: 50 }).default('STARTED'), // STARTED, COMPLETED, OEM_VERIFIED
  start_time: timestamp('start_time'),
  completion_time: timestamp('completion_time'),
  parts_used: decimal('parts_used', { precision: 10, scale: 2 }),
  labour_used: decimal('labour_used', { precision: 10, scale: 2 })
});

export const tbl_goodwill_request = mysqlTable('tbl_goodwill_request', {
  request_id: varchar('request_id', { length: 50 }).primaryKey(),
  vin: varchar('vin', { length: 50 }).notNull(),
  customer_id: varchar('customer_id', { length: 50 }),
  job_id: int('job_id'),
  reason: text('reason'),
  category: varchar('category', { length: 50 }), // DEALER, OEM, POLICY
  requested_amount: decimal('requested_amount', { precision: 10, scale: 2 }),
  dealer_share_pct: decimal('dealer_share_pct', { precision: 5, scale: 2 }),
  oem_share_pct: decimal('oem_share_pct', { precision: 5, scale: 2 }),
  customer_share_pct: decimal('customer_share_pct', { precision: 5, scale: 2 }),
  workflow_state: varchar('workflow_state', { length: 50 }).default('DRAFT'),
  created_at: timestamp('created_at').defaultNow()
});

export const tbl_goodwill_line = mysqlTable('tbl_goodwill_line', {
  line_id: varchar('line_id', { length: 50 }).primaryKey(),
  request_id: varchar('request_id', { length: 50 }).notNull(),
  item_type: varchar('item_type', { length: 50 }), // PARTS, LABOUR, CONSUMABLES, SUBLET
  requested_amount: decimal('requested_amount', { precision: 10, scale: 2 }),
  approved_amount: decimal('approved_amount', { precision: 10, scale: 2 }),
  rejected_amount: decimal('rejected_amount', { precision: 10, scale: 2 }),
  reason: text('reason')
});

export const tbl_goodwill_approval = mysqlTable('tbl_goodwill_approval', {
  approval_id: varchar('approval_id', { length: 50 }).primaryKey(),
  request_id: varchar('request_id', { length: 50 }).notNull(),
  approver_id: varchar('approver_id', { length: 50 }),
  approval_level: varchar('approval_level', { length: 50 }),
  decision: varchar('decision', { length: 50 }),
  remarks: text('remarks'),
  timestamp: timestamp('timestamp').defaultNow()
});

export const tbl_goodwill_settlement = mysqlTable('tbl_goodwill_settlement', {
  settlement_id: varchar('settlement_id', { length: 50 }).primaryKey(),
  request_id: varchar('request_id', { length: 50 }).notNull(),
  oem_recovery: decimal('oem_recovery', { precision: 10, scale: 2 }),
  dealer_cost: decimal('dealer_cost', { precision: 10, scale: 2 }),
  customer_cost: decimal('customer_cost', { precision: 10, scale: 2 }),
  payment_status: varchar('payment_status', { length: 50 }).default('PENDING')
});

export const tbl_fsb_goodwill_history = mysqlTable('tbl_fsb_goodwill_history', {
  history_id: varchar('history_id', { length: 50 }).primaryKey(),
  reference_id: varchar('reference_id', { length: 50 }).notNull(), // Campaign ID or Request ID
  domain: varchar('domain', { length: 50 }).notNull(), // FSB or GOODWILL
  action: varchar('action', { length: 50 }),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow()
});




// -------------------------------------------------------------------
// WOS BREAKDOWN & QRT MANAGEMENT (SPRINT 10)
// -------------------------------------------------------------------

export const tbl_breakdown_case = mysqlTable('tbl_breakdown_case', {
  case_id: varchar('case_id', { length: 50 }).primaryKey(),
  customer_id: varchar('customer_id', { length: 50 }),
  vin: varchar('vin', { length: 50 }).notNull(),
  registration_number: varchar('registration_number', { length: 50 }),
  current_odometer: int('current_odometer'),
  breakdown_type: varchar('breakdown_type', { length: 50 }), // ACCIDENT, MECHANICAL, ELECTRICAL
  severity: varchar('severity', { length: 50 }),
  priority: varchar('priority', { length: 50 }).default('NORMAL'),
  complaint: text('complaint'),
  location_address: text('location_address'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  source: varchar('source', { length: 50 }), // HELPLINE, APP
  workflow_state: varchar('workflow_state', { length: 50 }).default('REPORTED'),
  created_at: timestamp('created_at').defaultNow()
});

export const tbl_breakdown_dispatch = mysqlTable('tbl_breakdown_dispatch', {
  dispatch_id: varchar('dispatch_id', { length: 50 }).primaryKey(),
  case_id: varchar('case_id', { length: 50 }).notNull(),
  workshop_id: varchar('workshop_id', { length: 50 }),
  qrt_team_id: varchar('qrt_team_id', { length: 50 }),
  technician_id: varchar('technician_id', { length: 50 }),
  mobile_van_id: varchar('mobile_van_id', { length: 50 }),
  dispatch_status: varchar('dispatch_status', { length: 50 }),
  dispatch_time: timestamp('dispatch_time'),
  estimated_arrival_time: timestamp('estimated_arrival_time'),
  actual_arrival_time: timestamp('actual_arrival_time'),
  completion_time: timestamp('completion_time')
});

export const tbl_breakdown_dispatch_history = mysqlTable('tbl_breakdown_dispatch_history', {
  history_id: varchar('history_id', { length: 50 }).primaryKey(),
  dispatch_id: varchar('dispatch_id', { length: 50 }).notNull(),
  previous_technician_id: varchar('previous_technician_id', { length: 50 }),
  new_technician_id: varchar('new_technician_id', { length: 50 }),
  reason: text('reason'),
  reassigned_at: timestamp('reassigned_at').defaultNow()
});

export const tbl_breakdown_tracking = mysqlTable('tbl_breakdown_tracking', {
  tracking_id: varchar('tracking_id', { length: 50 }).primaryKey(),
  dispatch_id: varchar('dispatch_id', { length: 50 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  speed_kmh: int('speed_kmh'),
  distance_remaining_km: decimal('distance_remaining_km', { precision: 10, scale: 2 }),
  eta_minutes: int('eta_minutes'),
  timestamp: timestamp('timestamp').defaultNow()
});

export const tbl_breakdown_geo_snapshot = mysqlTable('tbl_breakdown_geo_snapshot', {
  snapshot_id: varchar('snapshot_id', { length: 50 }).primaryKey(),
  case_id: varchar('case_id', { length: 50 }).notNull(),
  event_type: varchar('event_type', { length: 50 }), // E.g., TECHNICIAN_ARRIVED, TOW_STARTED
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  timestamp: timestamp('timestamp').defaultNow()
});

export const tbl_breakdown_activity = mysqlTable('tbl_breakdown_activity', {
  activity_id: varchar('activity_id', { length: 50 }).primaryKey(),
  case_id: varchar('case_id', { length: 50 }).notNull(),
  activity_type: varchar('activity_type', { length: 50 }),
  description: text('description'),
  performed_by: varchar('performed_by', { length: 50 }),
  timestamp: timestamp('timestamp').defaultNow()
});

export const tbl_breakdown_diagnosis = mysqlTable('tbl_breakdown_diagnosis', {
  diagnosis_id: varchar('diagnosis_id', { length: 50 }).primaryKey(),
  case_id: varchar('case_id', { length: 50 }).notNull(),
  system_category: varchar('system_category', { length: 50 }), // ENGINE, TRANSMISSION, ELECTRICAL
  sub_system: varchar('sub_system', { length: 50 }),
  fault_code: varchar('fault_code', { length: 50 }),
  root_cause: text('root_cause'),
  repair_recommendation: text('repair_recommendation'),
  estimated_parts_cost: decimal('estimated_parts_cost', { precision: 10, scale: 2 }),
  estimated_labour_cost: decimal('estimated_labour_cost', { precision: 10, scale: 2 }),
  estimated_time_minutes: int('estimated_time_minutes'),
  technician_notes: text('technician_notes')
});

export const tbl_breakdown_tow = mysqlTable('tbl_breakdown_tow', {
  tow_id: varchar('tow_id', { length: 50 }).primaryKey(),
  case_id: varchar('case_id', { length: 50 }).notNull(),
  vendor_id: varchar('vendor_id', { length: 50 }),
  tow_vehicle_number: varchar('tow_vehicle_number', { length: 50 }),
  pickup_time: timestamp('pickup_time'),
  drop_time: timestamp('drop_time'),
  destination_workshop_id: varchar('destination_workshop_id', { length: 50 }),
  distance_km: decimal('distance_km', { precision: 10, scale: 2 }),
  tow_charges: decimal('tow_charges', { precision: 10, scale: 2 }),
  vendor_rating: int('vendor_rating'),
  status: varchar('status', { length: 50 })
});

export const tbl_breakdown_feedback = mysqlTable('tbl_breakdown_feedback', {
  feedback_id: varchar('feedback_id', { length: 50 }).primaryKey(),
  case_id: varchar('case_id', { length: 50 }).notNull(),
  response_time_rating: int('response_time_rating'),
  technician_rating: int('technician_rating'),
  resolution_rating: int('resolution_rating'),
  overall_rating: int('overall_rating'),
  remarks: text('remarks')
});

export const tbl_breakdown_history = mysqlTable('tbl_breakdown_history', {
  history_id: varchar('history_id', { length: 50 }).primaryKey(),
  case_id: varchar('case_id', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow()
});

// -------------------------------------------------------------------
// WOS WORKSHOP OPERATIONS MANAGEMENT (SPRINT 11)
// -------------------------------------------------------------------

export const tbl_gate_entry = mysqlTable('tbl_gate_entry', {
  gate_entry_id: varchar('gate_entry_id', { length: 50 }).primaryKey(),
  vin: varchar('vin', { length: 50 }).notNull(),
  customer_id: varchar('customer_id', { length: 50 }),
  arrival_time: timestamp('arrival_time').defaultNow(),
  source: varchar('source', { length: 50 }),
  appointment_id: varchar('appointment_id', { length: 50 }),
  breakdown_id: varchar('breakdown_id', { length: 50 }),
  advisor_id: varchar('advisor_id', { length: 50 }),
  odometer: int('odometer'),
  fuel_level: int('fuel_level'),
  driver_details: text('driver_details'),
  initial_remarks: text('initial_remarks'),
  status: varchar('status', { length: 50 })
});

export const tbl_workshop_appointment = mysqlTable('tbl_workshop_appointment', {
  appointment_id: varchar('appointment_id', { length: 50 }).primaryKey(),
  vin: varchar('vin', { length: 50 }).notNull(),
  customer_id: varchar('customer_id', { length: 50 }),
  preferred_date: timestamp('preferred_date'),
  service_type: varchar('service_type', { length: 50 }),
  advisor_id: varchar('advisor_id', { length: 50 }),
  status: varchar('status', { length: 50 })
});

export const tbl_job_card = mysqlTable('tbl_job_card', {
  job_card_id: varchar('job_card_id', { length: 50 }).primaryKey(),
  gate_entry_id: varchar('gate_entry_id', { length: 50 }),
  breakdown_id: varchar('breakdown_id', { length: 50 }),
  appointment_id: varchar('appointment_id', { length: 50 }),
  warranty_id: varchar('warranty_id', { length: 50 }),
  amc_id: varchar('amc_id', { length: 50 }),
  fsb_id: varchar('fsb_id', { length: 50 }),
  service_type: varchar('service_type', { length: 50 }),
  advisor_id: varchar('advisor_id', { length: 50 }),
  customer_complaint: text('customer_complaint'),
  workflow_state: varchar('workflow_state', { length: 50 }).default('JOB_CARD_CREATED'),
  operational_state: varchar('operational_state', { length: 50 }),
  created_at: timestamp('created_at').defaultNow()
});

export const tbl_job_card_revision = mysqlTable('tbl_job_card_revision', {
  revision_id: varchar('revision_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  version: int('version'),
  changes_summary: text('changes_summary'),
  revised_by: varchar('revised_by', { length: 50 }),
  timestamp: timestamp('timestamp').defaultNow()
});

export const tbl_job_operation = mysqlTable('tbl_job_operation', {
  operation_id: varchar('operation_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  operation_code: varchar('operation_code', { length: 50 }),
  description: text('description'),
  standard_hours: decimal('standard_hours', { precision: 10, scale: 2 }),
  actual_hours: decimal('actual_hours', { precision: 10, scale: 2 }),
  technician_id: varchar('technician_id', { length: 50 }),
  bay_id: varchar('bay_id', { length: 50 }),
  status: varchar('status', { length: 50 }),
  start_time: timestamp('start_time'),
  end_time: timestamp('end_time'),
  pause_time_minutes: int('pause_time_minutes').default(0),
  waiting_time_minutes: int('waiting_time_minutes').default(0),
  rework_count: int('rework_count').default(0)
});

export const tbl_workshop_estimate = mysqlTable('tbl_workshop_estimate', {
  estimate_id: varchar('estimate_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  total_labour: decimal('total_labour', { precision: 10, scale: 2 }),
  total_parts: decimal('total_parts', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 50 }),
  current_version: int('current_version').default(1),
  created_at: timestamp('created_at').defaultNow()
});

export const tbl_workshop_estimate_revision = mysqlTable('tbl_workshop_estimate_revision', {
  revision_id: varchar('revision_id', { length: 50 }).primaryKey(),
  estimate_id: varchar('estimate_id', { length: 50 }).notNull(),
  version: int('version'),
  total_amount: decimal('total_amount', { precision: 10, scale: 2 }),
  customer_remarks: text('customer_remarks'),
  timestamp: timestamp('timestamp').defaultNow()
});

export const tbl_bay_master = mysqlTable('tbl_bay_master', {
  bay_id: varchar('bay_id', { length: 50 }).primaryKey(),
  workshop_id: varchar('workshop_id', { length: 50 }),
  bay_type: varchar('bay_type', { length: 50 }),
  status: varchar('status', { length: 50 })
});

export const tbl_bay_allocation = mysqlTable('tbl_bay_allocation', {
  allocation_id: varchar('allocation_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  bay_id: varchar('bay_id', { length: 50 }),
  allocated_time: timestamp('allocated_time').defaultNow(),
  released_time: timestamp('released_time')
});

export const tbl_quality_inspection = mysqlTable('tbl_quality_inspection', {
  inspection_id: varchar('inspection_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  inspection_stage: varchar('inspection_stage', { length: 50 }), // IN_PROCESS, FINAL
  inspector_id: varchar('inspector_id', { length: 50 }),
  status: varchar('status', { length: 50 }),
  timestamp: timestamp('timestamp').defaultNow()
});

export const tbl_vehicle_delivery = mysqlTable('tbl_vehicle_delivery', {
  delivery_id: varchar('delivery_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  delivery_time: timestamp('delivery_time').defaultNow(),
  status: varchar('status', { length: 50 })
});

export const tbl_workshop_timeline = mysqlTable('tbl_workshop_timeline', {
  timeline_id: varchar('timeline_id', { length: 50 }).primaryKey(),
  reference_id: varchar('reference_id', { length: 50 }).notNull(), // Job Card or Gate Entry
  event_type: varchar('event_type', { length: 50 }),
  description: text('description'),
  performed_by: varchar('performed_by', { length: 50 }),
  timestamp: timestamp('timestamp').defaultNow()
});

// -------------------------------------------------------------------
// PARTS & INVENTORY MANAGEMENT (SPRINT 12)
// -------------------------------------------------------------------

export const tbl_parts_master = mysqlTable('tbl_parts_master', {
  part_number: varchar('part_number', { length: 100 }).primaryKey(),
  part_description: text('part_description'),
  oem_part_number: varchar('oem_part_number', { length: 100 }),
  category: varchar('category', { length: 50 }),
  sub_category: varchar('sub_category', { length: 50 }),
  uom: varchar('uom', { length: 20 }),
  hsn_code: varchar('hsn_code', { length: 20 }),
  gst_rate: decimal('gst_rate', { precision: 5, scale: 2 }),
  abc_classification: varchar('abc_classification', { length: 1 }), // A, B, C
  fsn_classification: varchar('fsn_classification', { length: 1 }), // F, S, N
  critical_part_flag: boolean('critical_part_flag').default(false),
  warranty_eligible: boolean('warranty_eligible').default(true),
  shelf_life_days: int('shelf_life_days'),
  min_stock: int('min_stock').default(0),
  max_stock: int('max_stock').default(0),
  reorder_level: int('reorder_level').default(0),
  reorder_quantity: int('reorder_quantity').default(0),
  preferred_vendor_id: varchar('preferred_vendor_id', { length: 50 }),
  status: varchar('status', { length: 50 })
});

export const tbl_part_supersession = mysqlTable('tbl_part_supersession', {
  supersession_id: varchar('supersession_id', { length: 50 }).primaryKey(),
  old_part_number: varchar('old_part_number', { length: 100 }).notNull(),
  new_part_number: varchar('new_part_number', { length: 100 }).notNull(),
  effective_date: timestamp('effective_date').defaultNow(),
  status: varchar('status', { length: 50 })
});

export const tbl_warehouse_master = mysqlTable('tbl_warehouse_master', {
  warehouse_id: varchar('warehouse_id', { length: 50 }).primaryKey(),
  branch_id: varchar('branch_id', { length: 50 }),
  location: varchar('location', { length: 100 }),
  type: varchar('type', { length: 50 }),
  status: varchar('status', { length: 50 })
});

export const tbl_bin_master = mysqlTable('tbl_bin_master', {
  bin_id: varchar('bin_id', { length: 50 }).primaryKey(),
  warehouse_id: varchar('warehouse_id', { length: 50 }).notNull(),
  bin_code: varchar('bin_code', { length: 50 }),
  rack: varchar('rack', { length: 50 }),
  shelf: varchar('shelf', { length: 50 }),
  capacity: int('capacity'),
  status: varchar('status', { length: 50 })
});

export const tbl_inventory_stock = mysqlTable('tbl_inventory_stock', {
  stock_id: varchar('stock_id', { length: 50 }).primaryKey(),
  part_number: varchar('part_number', { length: 100 }).notNull(),
  warehouse_id: varchar('warehouse_id', { length: 50 }).notNull(),
  bin_id: varchar('bin_id', { length: 50 }),
  current_quantity: decimal('current_quantity', { precision: 12, scale: 2 }).default('0'),
  reserved_quantity: decimal('reserved_quantity', { precision: 12, scale: 2 }).default('0'),
  available_quantity: decimal('available_quantity', { precision: 12, scale: 2 }).default('0'),
  blocked_quantity: decimal('blocked_quantity', { precision: 12, scale: 2 }).default('0'),
  in_transit_quantity: decimal('in_transit_quantity', { precision: 12, scale: 2 }).default('0'),
  average_cost: decimal('average_cost', { precision: 12, scale: 2 }).default('0'),
  last_purchase_cost: decimal('last_purchase_cost', { precision: 12, scale: 2 }).default('0'),
  inventory_value: decimal('inventory_value', { precision: 15, scale: 2 }).default('0')
});

export const tbl_inventory_batch = mysqlTable('tbl_inventory_batch', {
  batch_id: varchar('batch_id', { length: 50 }).primaryKey(),
  part_number: varchar('part_number', { length: 100 }).notNull(),
  batch_number: varchar('batch_number', { length: 100 }).notNull(),
  manufacturing_date: timestamp('manufacturing_date'),
  expiry_date: timestamp('expiry_date'),
  status: varchar('status', { length: 50 })
});

export const tbl_inventory_serial = mysqlTable('tbl_inventory_serial', {
  serial_id: varchar('serial_id', { length: 50 }).primaryKey(),
  part_number: varchar('part_number', { length: 100 }).notNull(),
  serial_number: varchar('serial_number', { length: 100 }).notNull(),
  batch_id: varchar('batch_id', { length: 50 }),
  warehouse_id: varchar('warehouse_id', { length: 50 }),
  status: varchar('status', { length: 50 }) // e.g. IN_STOCK, ISSUED, RETURNED
});

export const tbl_goods_receipt = mysqlTable('tbl_goods_receipt', {
  grn_number: varchar('grn_number', { length: 50 }).primaryKey(),
  vendor_id: varchar('vendor_id', { length: 50 }),
  po_reference: varchar('po_reference', { length: 50 }),
  invoice_number: varchar('invoice_number', { length: 50 }),
  invoice_date: timestamp('invoice_date'),
  received_date: timestamp('received_date').defaultNow(),
  warehouse_id: varchar('warehouse_id', { length: 50 }),
  status: varchar('status', { length: 50 })
});

export const tbl_goods_receipt_line = mysqlTable('tbl_goods_receipt_line', {
  grn_line_id: varchar('grn_line_id', { length: 50 }).primaryKey(),
  grn_number: varchar('grn_number', { length: 50 }).notNull(),
  part_number: varchar('part_number', { length: 100 }).notNull(),
  ordered_quantity: decimal('ordered_quantity', { precision: 10, scale: 2 }),
  received_quantity: decimal('received_quantity', { precision: 10, scale: 2 }),
  accepted_quantity: decimal('accepted_quantity', { precision: 10, scale: 2 }),
  rejected_quantity: decimal('rejected_quantity', { precision: 10, scale: 2 }),
  rate: decimal('rate', { precision: 10, scale: 2 }),
  tax: decimal('tax', { precision: 10, scale: 2 }),
  batch_number: varchar('batch_number', { length: 100 }),
  serial_number: varchar('serial_number', { length: 100 }),
  expiry_date: timestamp('expiry_date')
});

export const tbl_stock_transaction = mysqlTable('tbl_stock_transaction', {
  transaction_id: varchar('transaction_id', { length: 50 }).primaryKey(),
  transaction_type: varchar('transaction_type', { length: 50 }), // GRN, ISSUE, RETURN, TRANSFER, ADJUSTMENT
  part_number: varchar('part_number', { length: 100 }).notNull(),
  warehouse_id: varchar('warehouse_id', { length: 50 }),
  bin_id: varchar('bin_id', { length: 50 }),
  reference_type: varchar('reference_type', { length: 50 }), // e.g. GRN_NO, ISSUE_NO, TRANSFER_NO
  reference_id: varchar('reference_id', { length: 50 }),
  quantity: decimal('quantity', { precision: 12, scale: 2 }),
  unit_cost: decimal('unit_cost', { precision: 12, scale: 2 }),
  running_balance: decimal('running_balance', { precision: 12, scale: 2 }),
  transaction_time: timestamp('transaction_time').defaultNow(),
  performed_by: varchar('performed_by', { length: 50 }),
  reason: text('reason') // specific for adjustments
});

export const tbl_stock_reservation = mysqlTable('tbl_stock_reservation', {
  reservation_number: varchar('reservation_number', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }),
  part_number: varchar('part_number', { length: 100 }).notNull(),
  reserved_quantity: decimal('reserved_quantity', { precision: 12, scale: 2 }),
  issued_quantity: decimal('issued_quantity', { precision: 12, scale: 2 }).default('0'),
  released_quantity: decimal('released_quantity', { precision: 12, scale: 2 }).default('0'),
  status: varchar('status', { length: 50 })
});

export const tbl_goods_issue = mysqlTable('tbl_goods_issue', {
  issue_number: varchar('issue_number', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }),
  part_number: varchar('part_number', { length: 100 }).notNull(),
  issued_quantity: decimal('issued_quantity', { precision: 12, scale: 2 }),
  warehouse_id: varchar('warehouse_id', { length: 50 }),
  bin_id: varchar('bin_id', { length: 50 }),
  technician_id: varchar('technician_id', { length: 50 }),
  issue_time: timestamp('issue_time').defaultNow()
});

export const tbl_goods_return = mysqlTable('tbl_goods_return', {
  return_number: varchar('return_number', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }),
  part_number: varchar('part_number', { length: 100 }).notNull(),
  returned_quantity: decimal('returned_quantity', { precision: 12, scale: 2 }),
  reason: varchar('reason', { length: 100 }),
  condition: varchar('condition', { length: 50 }), // GOOD, DEFECTIVE
  warehouse_id: varchar('warehouse_id', { length: 50 }),
  return_time: timestamp('return_time').defaultNow()
});

export const tbl_stock_transfer = mysqlTable('tbl_stock_transfer', {
  transfer_number: varchar('transfer_number', { length: 50 }).primaryKey(),
  source_warehouse_id: varchar('source_warehouse_id', { length: 50 }),
  destination_warehouse_id: varchar('destination_warehouse_id', { length: 50 }),
  part_number: varchar('part_number', { length: 100 }).notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 2 }),
  dispatch_time: timestamp('dispatch_time'),
  receipt_time: timestamp('receipt_time'),
  status: varchar('status', { length: 50 }) // DISPATCHED, IN_TRANSIT, RECEIVED
});

export const tbl_stock_verification = mysqlTable('tbl_stock_verification', {
  verification_number: varchar('verification_number', { length: 50 }).primaryKey(),
  warehouse_id: varchar('warehouse_id', { length: 50 }),
  verification_date: timestamp('verification_date').defaultNow(),
  system_quantity: decimal('system_quantity', { precision: 12, scale: 2 }),
  physical_quantity: decimal('physical_quantity', { precision: 12, scale: 2 }),
  variance: decimal('variance', { precision: 12, scale: 2 }),
  approved_by: varchar('approved_by', { length: 50 })
});

// -------------------------------------------------------------------
// BILLING & FINANCE MANAGEMENT (SPRINT 13)
// -------------------------------------------------------------------

export const tbl_chart_of_accounts = mysqlTable('tbl_chart_of_accounts', {
  account_id: varchar('account_id', { length: 50 }).primaryKey(),
  account_code: varchar('account_code', { length: 50 }).notNull().unique(),
  account_name: varchar('account_name', { length: 150 }).notNull(),
  account_group: varchar('account_group', { length: 100 }),
  account_type: varchar('account_type', { length: 50 }), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  status: varchar('status', { length: 50 })
});

export const tbl_financial_period = mysqlTable('tbl_financial_period', {
  period_id: varchar('period_id', { length: 50 }).primaryKey(),
  financial_year: varchar('financial_year', { length: 20 }), // e.g. FY26-27
  period_name: varchar('period_name', { length: 50 }), // e.g. P1-APR
  start_date: timestamp('start_date'),
  end_date: timestamp('end_date'),
  status: varchar('status', { length: 50 }) // OPEN, LOCKED, CLOSED
});

export const tbl_invoice_sequence = mysqlTable('tbl_invoice_sequence', {
  sequence_id: varchar('sequence_id', { length: 50 }).primaryKey(),
  financial_year: varchar('financial_year', { length: 20 }),
  branch_id: varchar('branch_id', { length: 50 }),
  invoice_type: varchar('invoice_type', { length: 50 }),
  current_sequence: int('current_sequence').default(0)
});

export const tbl_invoice = mysqlTable('tbl_invoice', {
  invoice_id: varchar('invoice_id', { length: 50 }).primaryKey(),
  invoice_number: varchar('invoice_number', { length: 100 }).unique(),
  invoice_date: timestamp('invoice_date').defaultNow(),
  invoice_type: varchar('invoice_type', { length: 50 }),
  customer_id: varchar('customer_id', { length: 50 }),
  job_card_id: varchar('job_card_id', { length: 50 }),
  estimate_id: varchar('estimate_id', { length: 50 }),
  warranty_id: varchar('warranty_id', { length: 50 }),
  amc_id: varchar('amc_id', { length: 50 }),
  fsb_id: varchar('fsb_id', { length: 50 }),
  goodwill_id: varchar('goodwill_id', { length: 50 }),
  breakdown_id: varchar('breakdown_id', { length: 50 }),
  branch_id: varchar('branch_id', { length: 50 }),
  status: varchar('status', { length: 50 }), // DRAFT, VERIFIED, APPROVED, POSTED, CANCELLED
  currency: varchar('currency', { length: 10 }).default('INR'),
  total_labour: decimal('total_labour', { precision: 12, scale: 2 }),
  total_parts: decimal('total_parts', { precision: 12, scale: 2 }),
  discount: decimal('discount', { precision: 12, scale: 2 }).default('0'),
  taxable_amount: decimal('taxable_amount', { precision: 12, scale: 2 }),
  gst_amount: decimal('gst_amount', { precision: 12, scale: 2 }),
  grand_total: decimal('grand_total', { precision: 12, scale: 2 }),
  round_off: decimal('round_off', { precision: 12, scale: 2 }),
  net_amount: decimal('net_amount', { precision: 12, scale: 2 }),
  created_by: varchar('created_by', { length: 50 }),
  approved_by: varchar('approved_by', { length: 50 })
});

export const tbl_invoice_line = mysqlTable('tbl_invoice_line', {
  invoice_line_id: varchar('invoice_line_id', { length: 50 }).primaryKey(),
  invoice_id: varchar('invoice_id', { length: 50 }).notNull(),
  line_number: int('line_number'),
  item_type: varchar('item_type', { length: 50 }), // LABOUR, PART
  reference_operation_id: varchar('reference_operation_id', { length: 50 }),
  reference_part_number: varchar('reference_part_number', { length: 100 }),
  description: text('description'),
  quantity: decimal('quantity', { precision: 10, scale: 2 }),
  rate: decimal('rate', { precision: 12, scale: 2 }),
  discount: decimal('discount', { precision: 12, scale: 2 }).default('0'),
  taxable_amount: decimal('taxable_amount', { precision: 12, scale: 2 }),
  tax_amount: decimal('tax_amount', { precision: 12, scale: 2 }),
  net_amount: decimal('net_amount', { precision: 12, scale: 2 })
});

export const tbl_invoice_revision = mysqlTable('tbl_invoice_revision', {
  revision_id: varchar('revision_id', { length: 50 }).primaryKey(),
  invoice_id: varchar('invoice_id', { length: 50 }).notNull(),
  version: int('version'),
  reason: text('reason'),
  changed_by: varchar('changed_by', { length: 50 }),
  changed_date: timestamp('changed_date').defaultNow()
});

export const tbl_credit_note = mysqlTable('tbl_credit_note', {
  credit_note_id: varchar('credit_note_id', { length: 50 }).primaryKey(),
  credit_note_number: varchar('credit_note_number', { length: 100 }),
  invoice_id: varchar('invoice_id', { length: 50 }),
  reason: text('reason'),
  amount: decimal('amount', { precision: 12, scale: 2 }),
  gst_amount: decimal('gst_amount', { precision: 12, scale: 2 }),
  status: varchar('status', { length: 50 })
});

export const tbl_debit_note = mysqlTable('tbl_debit_note', {
  debit_note_id: varchar('debit_note_id', { length: 50 }).primaryKey(),
  debit_note_number: varchar('debit_note_number', { length: 100 }),
  invoice_id: varchar('invoice_id', { length: 50 }),
  reason: text('reason'),
  amount: decimal('amount', { precision: 12, scale: 2 }),
  gst_amount: decimal('gst_amount', { precision: 12, scale: 2 }),
  status: varchar('status', { length: 50 })
});

export const tbl_receipt = mysqlTable('tbl_receipt', {
  receipt_id: varchar('receipt_id', { length: 50 }).primaryKey(),
  receipt_number: varchar('receipt_number', { length: 100 }),
  customer_id: varchar('customer_id', { length: 50 }),
  receipt_date: timestamp('receipt_date').defaultNow(),
  amount: decimal('amount', { precision: 12, scale: 2 }),
  mode: varchar('mode', { length: 50 }), // CASH, CHEQUE, NEFT, UPI
  reference_number: varchar('reference_number', { length: 100 }), // e.g. UTR NO
  bank: varchar('bank', { length: 100 }),
  status: varchar('status', { length: 50 }) // POSTED, CANCELLED
});

export const tbl_payment_allocation = mysqlTable('tbl_payment_allocation', {
  allocation_id: varchar('allocation_id', { length: 50 }).primaryKey(),
  receipt_id: varchar('receipt_id', { length: 50 }).notNull(),
  invoice_id: varchar('invoice_id', { length: 50 }).notNull(),
  allocated_amount: decimal('allocated_amount', { precision: 12, scale: 2 }),
  allocation_date: timestamp('allocation_date').defaultNow()
});

export const tbl_customer_ledger = mysqlTable('tbl_customer_ledger', {
  ledger_entry_id: varchar('ledger_entry_id', { length: 50 }).primaryKey(),
  customer_id: varchar('customer_id', { length: 50 }).notNull(),
  reference_type: varchar('reference_type', { length: 50 }), // INVOICE, RECEIPT, CREDIT_NOTE
  reference_id: varchar('reference_id', { length: 50 }),
  debit: decimal('debit', { precision: 12, scale: 2 }).default('0'),
  credit: decimal('credit', { precision: 12, scale: 2 }).default('0'),
  running_balance: decimal('running_balance', { precision: 12, scale: 2 }),
  transaction_date: timestamp('transaction_date').defaultNow()
});

export const tbl_vendor_ledger = mysqlTable('tbl_vendor_ledger', {
  ledger_entry_id: varchar('ledger_entry_id', { length: 50 }).primaryKey(),
  vendor_id: varchar('vendor_id', { length: 50 }).notNull(),
  reference_type: varchar('reference_type', { length: 50 }), // GRN, PAYMENT
  reference_id: varchar('reference_id', { length: 50 }),
  debit: decimal('debit', { precision: 12, scale: 2 }).default('0'),
  credit: decimal('credit', { precision: 12, scale: 2 }).default('0'),
  running_balance: decimal('running_balance', { precision: 12, scale: 2 }),
  transaction_date: timestamp('transaction_date').defaultNow()
});

export const tbl_tax_transaction = mysqlTable('tbl_tax_transaction', {
  tax_txn_id: varchar('tax_txn_id', { length: 50 }).primaryKey(),
  reference_type: varchar('reference_type', { length: 50 }), // INVOICE, GRN
  reference_id: varchar('reference_id', { length: 50 }),
  tax_type: varchar('tax_type', { length: 50 }),
  gst_percent: decimal('gst_percent', { precision: 5, scale: 2 }),
  cgst: decimal('cgst', { precision: 12, scale: 2 }).default('0'),
  sgst: decimal('sgst', { precision: 12, scale: 2 }).default('0'),
  igst: decimal('igst', { precision: 12, scale: 2 }).default('0'),
  cess: decimal('cess', { precision: 12, scale: 2 }).default('0'),
  taxable_amount: decimal('taxable_amount', { precision: 12, scale: 2 }),
  tax_amount: decimal('tax_amount', { precision: 12, scale: 2 }),
  transaction_date: timestamp('transaction_date').defaultNow()
});

export const tbl_financial_journal = mysqlTable('tbl_financial_journal', {
  journal_id: varchar('journal_id', { length: 50 }).primaryKey(),
  journal_number: varchar('journal_number', { length: 100 }),
  voucher_type: varchar('voucher_type', { length: 50 }), // JV, RV, PV, SV, PURV
  reference_type: varchar('reference_type', { length: 50 }),
  reference_id: varchar('reference_id', { length: 50 }),
  posting_date: timestamp('posting_date').defaultNow(),
  status: varchar('status', { length: 50 }), // DRAFT, POSTED
  total_debit: decimal('total_debit', { precision: 15, scale: 2 }),
  total_credit: decimal('total_credit', { precision: 15, scale: 2 }),
  period_id: varchar('period_id', { length: 50 }),
  narration: text('narration')
});

export const tbl_financial_journal_line = mysqlTable('tbl_financial_journal_line', {
  journal_line_id: varchar('journal_line_id', { length: 50 }).primaryKey(),
  journal_id: varchar('journal_id', { length: 50 }).notNull(),
  account_id: varchar('account_id', { length: 50 }).notNull(),
  debit: decimal('debit', { precision: 15, scale: 2 }).default('0'),
  credit: decimal('credit', { precision: 15, scale: 2 }).default('0'),
  cost_center_branch: varchar('cost_center_branch', { length: 50 }),
  cost_center_dept: varchar('cost_center_dept', { length: 50 }),
  cost_center_entity: varchar('cost_center_entity', { length: 50 })
});

// -------------------------------------------------------------------
// EXECUTIVE MIS & ANALYTICS (SPRINT 14)
// -------------------------------------------------------------------

export const tbl_dashboard = mysqlTable('tbl_dashboard', {
  dashboard_id: varchar('dashboard_id', { length: 50 }).primaryKey(),
  dashboard_name: varchar('dashboard_name', { length: 150 }).notNull(),
  dashboard_type: varchar('dashboard_type', { length: 50 }),
  user_role: varchar('user_role', { length: 50 }),
  refresh_frequency: varchar('refresh_frequency', { length: 50 }),
  status: varchar('status', { length: 50 })
});

export const tbl_dashboard_widget = mysqlTable('tbl_dashboard_widget', {
  widget_id: varchar('widget_id', { length: 50 }).primaryKey(),
  dashboard_id: varchar('dashboard_id', { length: 50 }).notNull(),
  widget_type: varchar('widget_type', { length: 50 }),
  chart_type: varchar('chart_type', { length: 50 }),
  sequence: int('sequence'),
  configuration_json: text('configuration_json'),
  status: varchar('status', { length: 50 })
});

export const tbl_kpi_catalog = mysqlTable('tbl_kpi_catalog', {
  kpi_id: varchar('kpi_id', { length: 50 }).primaryKey(),
  kpi_name: varchar('kpi_name', { length: 150 }).notNull(),
  formula: text('formula'),
  owner_module: varchar('owner_module', { length: 50 }),
  refresh_policy: varchar('refresh_policy', { length: 50 }), // EVENT, SCHEDULED
  unit: varchar('unit', { length: 20 }),
  default_target: decimal('default_target', { precision: 15, scale: 2 }),
  status: varchar('status', { length: 50 })
});

export const tbl_kpi_snapshot = mysqlTable('tbl_kpi_snapshot', {
  snapshot_id: varchar('snapshot_id', { length: 50 }).primaryKey(),
  kpi_id: varchar('kpi_id', { length: 50 }).notNull(),
  run_id: varchar('run_id', { length: 50 }),
  version: int('version').default(1),
  snapshot_time: timestamp('snapshot_time').defaultNow(),
  branch_id: varchar('branch_id', { length: 50 }),
  business_unit: varchar('business_unit', { length: 50 }),
  kpi_value: decimal('kpi_value', { precision: 15, scale: 2 }),
  target: decimal('target', { precision: 15, scale: 2 }),
  variance: decimal('variance', { precision: 15, scale: 2 }),
  trend: varchar('trend', { length: 50 }) // UP, DOWN, FLAT
});

export const tbl_report_definition = mysqlTable('tbl_report_definition', {
  report_def_id: varchar('report_def_id', { length: 50 }).primaryKey(),
  report_name: varchar('report_name', { length: 150 }),
  module: varchar('module', { length: 50 }),
  query_json: text('query_json'),
  status: varchar('status', { length: 50 })
});

export const tbl_report_history = mysqlTable('tbl_report_history', {
  report_history_id: varchar('report_history_id', { length: 50 }).primaryKey(),
  report_def_id: varchar('report_def_id', { length: 50 }),
  generated_by: varchar('generated_by', { length: 50 }),
  generated_time: timestamp('generated_time').defaultNow(),
  parameters_json: text('parameters_json'),
  output_format: varchar('output_format', { length: 20 }), // PDF, CSV, EXCEL
  execution_status: varchar('execution_status', { length: 50 })
});

export const tbl_alert_rule = mysqlTable('tbl_alert_rule', {
  rule_id: varchar('rule_id', { length: 50 }).primaryKey(),
  rule_name: varchar('rule_name', { length: 150 }),
  kpi_id: varchar('kpi_id', { length: 50 }),
  threshold: decimal('threshold', { precision: 15, scale: 2 }),
  operator: varchar('operator', { length: 10 }), // >, <, ==, >=, <=
  notification_target: varchar('notification_target', { length: 100 }), // Role or User ID
  priority: varchar('priority', { length: 20 }), // LOW, MEDIUM, HIGH, CRITICAL
  status: varchar('status', { length: 50 })
});

export const tbl_alert_history = mysqlTable('tbl_alert_history', {
  alert_id: varchar('alert_id', { length: 50 }).primaryKey(),
  rule_id: varchar('rule_id', { length: 50 }),
  actual_value: decimal('actual_value', { precision: 15, scale: 2 }),
  threshold: decimal('threshold', { precision: 15, scale: 2 }),
  raised_time: timestamp('raised_time').defaultNow(),
  acknowledged_by: varchar('acknowledged_by', { length: 50 }),
  resolution: text('resolution')
});

export const tbl_exception_register = mysqlTable('tbl_exception_register', {
  exception_id: varchar('exception_id', { length: 50 }).primaryKey(),
  module: varchar('module', { length: 50 }),
  reference_id: varchar('reference_id', { length: 50 }),
  description: text('description'),
  severity: varchar('severity', { length: 50 }), // WARNING, CRITICAL
  status: varchar('status', { length: 50 }), // OPEN, INVESTIGATING, RESOLVED
  logged_time: timestamp('logged_time').defaultNow(),
  resolved_time: timestamp('resolved_time'),
  resolved_by: varchar('resolved_by', { length: 50 })
});

// -------------------------------------------------------------------
// AI INTELLIGENCE & DECISION SUPPORT (SPRINT 15)
// -------------------------------------------------------------------

export const tbl_ai_model = mysqlTable('tbl_ai_model', {
  model_id: varchar('model_id', { length: 50 }).primaryKey(),
  model_name: varchar('model_name', { length: 150 }).notNull(),
  version: varchar('version', { length: 20 }),
  purpose: varchar('purpose', { length: 100 }),
  owner: varchar('owner', { length: 50 }),
  training_frequency: varchar('training_frequency', { length: 50 }),
  dataset_metadata: text('dataset_metadata'),
  accuracy_metric: decimal('accuracy_metric', { precision: 5, scale: 2 }),
  status: varchar('status', { length: 50 })
});

export const tbl_ai_feature_store = mysqlTable('tbl_ai_feature_store', {
  feature_id: varchar('feature_id', { length: 50 }).primaryKey(),
  feature_name: varchar('feature_name', { length: 100 }),
  module: varchar('module', { length: 50 }),
  calculation_logic: text('calculation_logic'),
  last_calculated: timestamp('last_calculated'),
  status: varchar('status', { length: 50 })
});

export const tbl_ai_prediction = mysqlTable('tbl_ai_prediction', {
  prediction_id: varchar('prediction_id', { length: 50 }).primaryKey(),
  prediction_type: varchar('prediction_type', { length: 50 }),
  reference_module: varchar('reference_module', { length: 50 }),
  reference_id: varchar('reference_id', { length: 50 }),
  prediction: text('prediction'),
  confidence_score: decimal('confidence_score', { precision: 5, scale: 2 }),
  prediction_date: timestamp('prediction_date').defaultNow(),
  expiry_date: timestamp('expiry_date'),
  status: varchar('status', { length: 50 })
});

export const tbl_ai_recommendation = mysqlTable('tbl_ai_recommendation', {
  recommendation_id: varchar('recommendation_id', { length: 50 }).primaryKey(),
  module: varchar('module', { length: 50 }),
  reference_id: varchar('reference_id', { length: 50 }),
  recommendation: text('recommendation'),
  priority: varchar('priority', { length: 50 }),
  business_impact: text('business_impact'),
  confidence_score: decimal('confidence_score', { precision: 5, scale: 2 }),
  reasoning_summary: text('reasoning_summary'),
  created_time: timestamp('created_time').defaultNow(),
  status: varchar('status', { length: 50 })
});

export const tbl_ai_anomaly = mysqlTable('tbl_ai_anomaly', {
  anomaly_id: varchar('anomaly_id', { length: 50 }).primaryKey(),
  module: varchar('module', { length: 50 }),
  reference_id: varchar('reference_id', { length: 50 }),
  severity: varchar('severity', { length: 50 }),
  expected_value: decimal('expected_value', { precision: 15, scale: 2 }),
  actual_value: decimal('actual_value', { precision: 15, scale: 2 }),
  deviation: decimal('deviation', { precision: 15, scale: 2 }),
  detected_time: timestamp('detected_time').defaultNow(),
  status: varchar('status', { length: 50 })
});

export const tbl_ai_root_cause = mysqlTable('tbl_ai_root_cause', {
  analysis_id: varchar('analysis_id', { length: 50 }).primaryKey(),
  module: varchar('module', { length: 50 }),
  reference_id: varchar('reference_id', { length: 50 }),
  root_cause: text('root_cause'),
  contributing_factors: text('contributing_factors'),
  confidence: decimal('confidence', { precision: 5, scale: 2 }),
  generated_time: timestamp('generated_time').defaultNow()
});

export const tbl_ai_forecast = mysqlTable('tbl_ai_forecast', {
  forecast_id: varchar('forecast_id', { length: 50 }).primaryKey(),
  forecast_type: varchar('forecast_type', { length: 50 }),
  forecast_period: varchar('forecast_period', { length: 50 }),
  predicted_value: decimal('predicted_value', { precision: 15, scale: 2 }),
  confidence: decimal('confidence', { precision: 5, scale: 2 }),
  generated_time: timestamp('generated_time').defaultNow()
});

export const tbl_ai_conversation = mysqlTable('tbl_ai_conversation', {
  conversation_id: varchar('conversation_id', { length: 50 }).primaryKey(),
  user_id: varchar('user_id', { length: 50 }),
  question: text('question'),
  generated_sql_json: text('generated_sql_json'),
  response_summary: text('response_summary'),
  timestamp: timestamp('timestamp').defaultNow()
});

export const tbl_ai_feedback = mysqlTable('tbl_ai_feedback', {
  feedback_id: varchar('feedback_id', { length: 50 }).primaryKey(),
  recommendation_id: varchar('recommendation_id', { length: 50 }),
  accepted: boolean('accepted').default(false),
  rejected: boolean('rejected').default(false),
  user_id: varchar('user_id', { length: 50 }),
  comments: text('comments'),
  learning_flag: boolean('learning_flag').default(false)
});

export const tbl_ai_knowledge = mysqlTable('tbl_ai_knowledge', {
  knowledge_id: varchar('knowledge_id', { length: 50 }).primaryKey(),
  topic: varchar('topic', { length: 150 }),
  content: text('content'),
  source_document: varchar('source_document', { length: 150 }),
  last_updated: timestamp('last_updated').defaultNow(),
  status: varchar('status', { length: 50 })
});

export const tbl_ai_decision_log = mysqlTable('tbl_ai_decision_log', {
  decision_log_id: varchar('decision_log_id', { length: 50 }).primaryKey(),
  ai_output_type: varchar('ai_output_type', { length: 50 }), // PREDICTION, RECOMMENDATION, etc.
  reference_id: varchar('reference_id', { length: 50 }), // Link to tbl_ai_prediction etc.
  input_features_json: text('input_features_json'),
  model_version: varchar('model_version', { length: 50 }),
  reasoning_trace: text('reasoning_trace'),
  logged_time: timestamp('logged_time').defaultNow()
});

// -------------------------------------------------------------------
// PRODUCTION READINESS (RC-1)
// -------------------------------------------------------------------

export const tbl_system_configuration = mysqlTable('tbl_system_configuration', {
  config_key: varchar('config_key', { length: 150 }).primaryKey(),
  config_value: text('config_value'),
  description: text('description'),
  module: varchar('module', { length: 50 }),
  is_encrypted: boolean('is_encrypted').default(false),
  updated_at: timestamp('updated_at').defaultNow(),
  updated_by: varchar('updated_by', { length: 50 })
});

export const tbl_feature_flag = mysqlTable('tbl_feature_flag', {
  flag_key: varchar('flag_key', { length: 150 }).primaryKey(),
  is_enabled: boolean('is_enabled').default(false),
  description: text('description'),
  rollout_percentage: int('rollout_percentage').default(100),
  updated_at: timestamp('updated_at').defaultNow(),
  updated_by: varchar('updated_by', { length: 50 })
});

export const tbl_branch_configuration = mysqlTable('tbl_branch_configuration', {
  branch_id: varchar('branch_id', { length: 50 }),
  config_key: varchar('config_key', { length: 150 }),
  config_value: text('config_value'),
  updated_at: timestamp('updated_at').defaultNow(),
  updated_by: varchar('updated_by', { length: 50 })
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.branch_id, table.config_key] })
  };
});

export const tbl_system_health = mysqlTable('tbl_system_health', {
  health_id: varchar('health_id', { length: 50 }).primaryKey(),
  service_name: varchar('service_name', { length: 100 }),
  status: varchar('status', { length: 50 }),
  metrics_json: text('metrics_json'),
  checked_at: timestamp('checked_at').defaultNow()
});

export const tbl_job_execution = mysqlTable('tbl_job_execution', {
  execution_id: varchar('execution_id', { length: 50 }).primaryKey(),
  job_name: varchar('job_name', { length: 100 }),
  start_time: timestamp('start_time').defaultNow(),
  end_time: timestamp('end_time'),
  status: varchar('status', { length: 50 }), // RUNNING, SUCCESS, FAILED
  error_details: text('error_details'),
  duration_ms: int('duration_ms')
});

export const tbl_scheduler_history = mysqlTable('tbl_scheduler_history', {
  history_id: varchar('history_id', { length: 50 }).primaryKey(),
  scheduler_name: varchar('scheduler_name', { length: 100 }),
  trigger_time: timestamp('trigger_time').defaultNow(),
  status: varchar('status', { length: 50 })
});

export const tbl_application_log = mysqlTable('tbl_application_log', {
  log_id: varchar('log_id', { length: 50 }).primaryKey(),
  level: varchar('level', { length: 20 }), // INFO, WARN, ERROR
  module: varchar('module', { length: 50 }),
  correlation_id: varchar('correlation_id', { length: 100 }),
  message: text('message'),
  stack_trace: text('stack_trace'),
  timestamp: timestamp('timestamp').defaultNow()
});

export const tbl_enterprise_audit = mysqlTable('tbl_enterprise_audit', {
  audit_id: varchar('audit_id', { length: 50 }).primaryKey(),
  correlation_id: varchar('correlation_id', { length: 100 }),
  event_type: varchar('event_type', { length: 100 }),
  module: varchar('module', { length: 50 }),
  user_id: varchar('user_id', { length: 50 }),
  reference_id: varchar('reference_id', { length: 50 }),
  old_value_json: text('old_value_json'),
  new_value_json: text('new_value_json'),
  ip_address: varchar('ip_address', { length: 50 }),
  is_sensitive: boolean('is_sensitive').default(false),
  timestamp: timestamp('timestamp').defaultNow()
});

export const policyMaster = mysqlTable('tbl_policy_master', {
  policy_id: varchar('policy_id', { length: 50 }).primaryKey(),
  policy_type: varchar('policy_type', { length: 50 }).notNull(),
  version: varchar('version', { length: 20 }),
  circular_ref_no: varchar('circular_ref_no', { length: 100 }),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow()
});

export const policyApplicability = mysqlTable('tbl_policy_applicability', {
  rule_id: varchar('rule_id', { length: 50 }).primaryKey(),
  policy_id: varchar('policy_id', { length: 50 }).notNull(),
  vehicle_model: varchar('vehicle_model', { length: 100 }),
  vin_start_range: varchar('vin_start_range', { length: 50 }),
  vin_end_range: varchar('vin_end_range', { length: 50 }),
  max_age_months: int('max_age_months'),
  max_mileage_km: int('max_mileage_km')
});

export const policyLabourRules = mysqlTable('tbl_policy_labour_rules', {
  rule_id: varchar('rule_id', { length: 50 }).primaryKey(),
  policy_id: varchar('policy_id', { length: 50 }).notNull(),
  labour_code_prefix: varchar('labour_code_prefix', { length: 50 }),
  is_covered: boolean('is_covered').default(true)
});

export const policyPartsRules = mysqlTable('tbl_policy_parts_rules', {
  rule_id: varchar('rule_id', { length: 50 }).primaryKey(),
  policy_id: varchar('policy_id', { length: 50 }).notNull(),
  causal_part_prefix: varchar('causal_part_prefix', { length: 50 }),
  is_covered: boolean('is_covered').default(true)
});

export const policyApprovalMatrix = mysqlTable('tbl_policy_approval_matrix', {
  matrix_id: varchar('matrix_id', { length: 50 }).primaryKey(),
  policy_id: varchar('policy_id', { length: 50 }).notNull(),
  claim_value_threshold: int('claim_value_threshold').notNull(),
  required_role: varchar('required_role', { length: 50 }).notNull()
});

export const policyAuditLogs = mysqlTable('tbl_policy_audit_logs', {
  audit_id: varchar('audit_id', { length: 50 }).primaryKey(),
  job_id: int('job_id'),
  policy_type: varchar('policy_type', { length: 50 }),
  evaluation_result: varchar('evaluation_result', { length: 50 }),
  reason: text('reason'),
  source_policy: varchar('source_policy', { length: 50 }),
  evaluated_criteria: varchar('evaluated_criteria', { length: 100 }),
  required_approval_role: varchar('required_approval_role', { length: 50 }),
  timestamp: timestamp('timestamp').defaultNow()
});

export const jobCardComplaintHistory = mysqlTable('job_card_complaint_history', {
  id: int('id').primaryKey().autoincrement(),
  job_card_id: int('job_card_id').notNull(),
  version_number: int('version_number').notNull(),
  complaint_text: text('complaint_text').notNull(),
  edited_by_user_id: int('edited_by_user_id'),
  edited_by_name: varchar('edited_by_name', { length: 100 }).notNull(),
  edited_role: varchar('edited_role', { length: 50 }).notNull(),
  branch_id: int('branch_id').default(1),
  edit_reason: text('edit_reason'),
  source: varchar('source', { length: 50 }).default('WEB_UI'),
  created_at: timestamp('created_at').defaultNow()
});

// =============================================================================
// DWIP ENTERPRISE INTEGRATION LAYER GENERIC TABLES (Sprint IL-001)
// =============================================================================

export const integrationSystems = mysqlTable('integration_systems', {
  id: varchar('id', { length: 50 }).primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  baseUrl: text('base_url').notNull(),
  authType: varchar('auth_type', { length: 50 }).notNull().default('OAUTH2'),
  authConfig: text('auth_config'),
  timeoutMs: int('timeout_ms').default(10000),
  retryCount: int('retry_count').default(3),
  cacheDurationSec: int('cache_duration_sec').default(3600),
  enabled: boolean('enabled').notNull().default(true),
  environment: varchar('environment', { length: 50 }).notNull().default('DEV'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const integrationSessions = mysqlTable('integration_sessions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  systemId: varchar('system_id', { length: 50 }).notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at'),
  status: varchar('status', { length: 50 }).default('ACTIVE'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow()
});

export const syncHistory = mysqlTable('sync_history', {
  id: varchar('id', { length: 50 }).primaryKey(),
  systemId: varchar('system_id', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  sourceRecordId: varchar('source_record_id', { length: 100 }).notNull(),
  dwipRecordId: varchar('dwip_record_id', { length: 100 }),
  action: varchar('action', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  checksum: varchar('checksum', { length: 100 }),
  version: int('version').default(1),
  durationMs: int('duration_ms'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow()
});

export const syncQueue = mysqlTable('sync_queue', {
  id: varchar('id', { length: 50 }).primaryKey(),
  systemId: varchar('system_id', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  sourceRecordId: varchar('source_record_id', { length: 100 }).notNull(),
  payload: text('payload'),
  priority: varchar('priority', { length: 20 }).default('NORMAL'),
  retryCount: int('retry_count').default(0),
  maxRetries: int('max_retries').default(5),
  nextRunAt: timestamp('next_run_at').defaultNow(),
  status: varchar('status', { length: 50 }).default('PENDING'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const apiLogs = mysqlTable('api_logs', {
  id: varchar('id', { length: 50 }).primaryKey(),
  systemId: varchar('system_id', { length: 50 }).notNull(),
  apiName: varchar('api_name', { length: 100 }).notNull(),
  userId: varchar('user_id', { length: 50 }),
  branchId: varchar('branch_id', { length: 50 }),
  moduleId: varchar('module_id', { length: 50 }),
  correlationId: varchar('correlation_id', { length: 100 }).notNull(),
  requestTime: timestamp('request_time').defaultNow(),
  responseTime: timestamp('response_time'),
  durationMs: int('duration_ms'),
  statusCode: int('status_code'),
  status: varchar('status', { length: 50 }).notNull(),
  requestPayload: text('request_payload'),
  responsePayload: text('response_payload'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow()
});

export const apiHealth = mysqlTable('api_health', {
  id: varchar('id', { length: 50 }).primaryKey(),
  systemId: varchar('system_id', { length: 50 }).notNull(),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  latencyMs: int('latency_ms').default(0),
  uptimePercentage: decimal('uptime_percentage', { precision: 5, scale: 2 }).default('100.00'),
  lastCheckedAt: timestamp('last_checked_at').defaultNow(),
  errorCount: int('error_count').default(0)
});

export const cacheMetadata = mysqlTable('cache_metadata', {
  id: varchar('id', { length: 50 }).primaryKey(),
  cacheKey: varchar('cache_key', { length: 255 }).notNull().unique(),
  tag: varchar('tag', { length: 100 }),
  driver: varchar('driver', { length: 50 }).default('MEMORY'),
  ttlSeconds: int('ttl_seconds').default(3600),
  expiresAt: timestamp('expires_at'),
  checksum: varchar('checksum', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const externalMappings = mysqlTable('external_mappings', {
  id: varchar('id', { length: 50 }).primaryKey(),
  systemId: varchar('system_id', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  externalId: varchar('external_id', { length: 100 }).notNull(),
  internalId: varchar('internal_id', { length: 100 }).notNull(),
  sourceSystem: varchar('source_system', { length: 50 }).notNull(),
  checksum: varchar('checksum', { length: 100 }),
  version: int('version').default(1),
  syncStatus: varchar('sync_status', { length: 50 }).default('SYNCED'),
  lastSyncTime: timestamp('last_sync_time').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// =============================================================================
// DWIP VEHICLE OPERATIONAL SESSION (VOS) CANONICAL SCHEMA (DWIP-DB-001 v1.0)
// =============================================================================

export const vosMaster = mysqlTable('vos', {
  id: varchar('id', { length: 36 }).primaryKey(),
  publicId: varchar('public_id', { length: 100 }).notNull().unique(),
  companyId: varchar('company_id', { length: 50 }).notNull(),
  dealerId: varchar('dealer_id', { length: 50 }).notNull(),
  vosNumber: varchar('vos_number', { length: 100 }).notNull().unique(),
  branchId: varchar('branch_id', { length: 50 }).notNull(),
  vehicleId: varchar('vehicle_id', { length: 50 }).notNull(),
  vehicleExternalId: varchar('vehicle_external_id', { length: 100 }),
  customerId: varchar('customer_id', { length: 50 }).notNull(),
  customerExternalId: varchar('customer_external_id', { length: 100 }),
  visitType: varchar('visit_type', { length: 50 }).notNull().default('NORMAL_SERVICE'),
  commercialType: varchar('commercial_type', { length: 50 }).notNull().default('CUSTOMER_PAY'),
  entrySource: varchar('entry_source', { length: 50 }).notNull().default('MANUAL'),
  isBreakdown: boolean('is_breakdown').notNull().default(false),
  gateInLatitude: decimal('gate_in_latitude', { precision: 10, scale: 8 }),
  gateInLongitude: decimal('gate_in_longitude', { precision: 11, scale: 8 }),
  locationAccuracy: decimal('location_accuracy', { precision: 6, scale: 2 }),
  currentState: varchar('current_state', { length: 50 }).notNull().default('GATE_IN'),
  currentStateCode: varchar('current_state_code', { length: 50 }).notNull().default('STATE_GATE_IN'),
  currentStateVersion: int('current_state_version').notNull().default(1),
  currentOwner: varchar('current_owner', { length: 50 }).notNull(),
  operationalStatus: varchar('operational_status', { length: 50 }).notNull().default('ACTIVE'),
  priority: varchar('priority', { length: 20 }).notNull().default('NORMAL'),
  riskLevel: varchar('risk_level', { length: 20 }).notNull().default('LOW'),
  riskScore: int('risk_score').notNull().default(0),
  riskReason: text('risk_reason'),
  sourceSystem: varchar('source_system', { length: 50 }),
  syncStatus: varchar('sync_status', { length: 50 }),
  syncVersion: int('sync_version').default(1),
  lastSyncedAt: timestamp('last_synced_at'),
  externalReference: varchar('external_reference', { length: 100 }),
  dataClassification: varchar('data_classification', { length: 30 }).notNull().default('INTERNAL'),
  gateInTime: timestamp('gate_in_time').defaultNow(),
  gateOutTime: timestamp('gate_out_time'),
  closedAt: timestamp('closed_at'),
  isClosed: boolean('is_closed').notNull().default(false),
  // Immutable Vehicle Snapshot
  registrationNumber: varchar('registration_number', { length: 50 }).notNull(),
  chassisNumber: varchar('chassis_number', { length: 100 }).notNull(),
  engineNumber: varchar('engine_number', { length: 100 }),
  vehicleModel: varchar('vehicle_model', { length: 100 }),
  vehicleVariant: varchar('vehicle_variant', { length: 100 }),
  fuelType: varchar('fuel_type', { length: 50 }),
  emissionNorm: varchar('emission_norm', { length: 50 }),
  manufacturingYear: int('manufacturing_year'),
  odometerAtGateIn: int('odometer_at_gate_in'),
  warrantyStatusAtGateIn: varchar('warranty_status_at_gate_in', { length: 50 }),
  oemServicePlan: varchar('oem_service_plan', { length: 100 }),
  // Immutable Driver Snapshot
  driverName: varchar('driver_name', { length: 100 }),
  driverMobile: varchar('driver_mobile', { length: 30 }),
  driverLicenseNumber: varchar('driver_license_number', { length: 50 }),
  driverType: varchar('driver_type', { length: 50 }),
  // Immutable Customer Snapshot
  customerName: varchar('customer_name', { length: 150 }),
  fleetName: varchar('fleet_name', { length: 150 }),
  contactPerson: varchar('contact_person', { length: 100 }),
  gstNumber: varchar('gst_number', { length: 30 }),
  customerType: varchar('customer_type', { length: 50 }),
  fleetSize: int('fleet_size').default(1),
  // Audit Columns
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: varchar('created_by', { length: 50 }),
  updatedBy: varchar('updated_by', { length: 50 }),
  version: int('version').notNull().default(1),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at')
});

export const vosStateHistoryTable = mysqlTable('vos_state_history', {
  id: varchar('id', { length: 36 }).primaryKey(),
  publicId: varchar('public_id', { length: 100 }).notNull().unique(),
  vosId: varchar('vos_id', { length: 36 }).notNull(),
  fromState: varchar('from_state', { length: 50 }).notNull(),
  toState: varchar('to_state', { length: 50 }).notNull(),
  timeSpentSeconds: int('time_spent_seconds'),
  changedBy: varchar('changed_by', { length: 50 }).notNull(),
  changedByRole: varchar('changed_by_role', { length: 50 }).notNull(),
  transitionReason: text('transition_reason'),
  createdAt: timestamp('created_at').defaultNow()
});

export const vosOwnerHistoryTable = mysqlTable('vos_owner_history', {
  id: varchar('id', { length: 36 }).primaryKey(),
  publicId: varchar('public_id', { length: 100 }).notNull().unique(),
  vosId: varchar('vos_id', { length: 36 }).notNull(),
  previousOwner: varchar('previous_owner', { length: 50 }).notNull(),
  previousOwnerRole: varchar('previous_owner_role', { length: 50 }).notNull(),
  newOwner: varchar('new_owner', { length: 50 }).notNull(),
  newOwnerRole: varchar('new_owner_role', { length: 50 }).notNull(),
  handoverType: varchar('handover_type', { length: 50 }).notNull().default('MANUAL'),
  transferredBy: varchar('transferred_by', { length: 50 }).notNull(),
  handoverNotes: text('handover_notes'),
  createdAt: timestamp('created_at').defaultNow()
});

export const vosTimelineTable = mysqlTable('vos_timeline', {
  id: varchar('id', { length: 36 }).primaryKey(),
  publicId: varchar('public_id', { length: 100 }).notNull().unique(),
  vosId: varchar('vos_id', { length: 36 }).notNull(),
  timelineCategory: varchar('timeline_category', { length: 50 }).notNull().default('OPERATIONAL'),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  structuredMetadataJson: text('structured_metadata_json'),
  recordedAt: timestamp('recorded_at').defaultNow(),
  slaStatus: varchar('sla_status', { length: 20 })
});

export const vosConfigurationReferenceTable = mysqlTable('vos_configuration_reference', {
  id: varchar('id', { length: 36 }).primaryKey(),
  publicId: varchar('public_id', { length: 100 }).notNull().unique(),
  vosId: varchar('vos_id', { length: 36 }).notNull(),
  branchId: varchar('branch_id', { length: 50 }).notNull(),
  configVersion: varchar('config_version', { length: 50 }).notNull(),
  workflowVersion: varchar('workflow_version', { length: 50 }).notNull(),
  businessRuleVersion: varchar('business_rule_version', { length: 50 }).notNull(),
  rulesetSnapshotJson: text('ruleset_snapshot_json').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const vosLinksTable = mysqlTable('vos_links', {
  id: varchar('id', { length: 36 }).primaryKey(),
  publicId: varchar('public_id', { length: 100 }).notNull().unique(),
  vosId: varchar('vos_id', { length: 36 }).notNull(),
  entityModule: varchar('entity_module', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  relationshipType: varchar('relationship_type', { length: 50 }).notNull().default('PRIMARY'),
  linkedBy: varchar('linked_by', { length: 50 }).notNull(),
  linkedAt: timestamp('linked_at').defaultNow(),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at')
});

export const vosAttributesTable = mysqlTable('vos_attributes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  publicId: varchar('public_id', { length: 100 }).notNull().unique(),
  vosId: varchar('vos_id', { length: 36 }).notNull(),
  attributeName: varchar('attribute_name', { length: 100 }).notNull(),
  attributeValue: text('attribute_value').notNull(),
  attributeType: varchar('attribute_type', { length: 50 }).notNull().default('STRING'),
  unit: varchar('unit', { length: 30 }),
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 4 }),
  source: varchar('source', { length: 50 }).notNull().default('GATE_IN'),
  capturedAt: timestamp('captured_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: varchar('created_by', { length: 50 })
});

export const vosTagsTable = mysqlTable('vos_tags', {
  id: varchar('id', { length: 36 }).primaryKey(),
  publicId: varchar('public_id', { length: 100 }).notNull().unique(),
  vosId: varchar('vos_id', { length: 36 }).notNull(),
  tagName: varchar('tag_name', { length: 100 }).notNull(),
  tagCategory: varchar('tag_category', { length: 50 }).notNull(),
  createdBy: varchar('created_by', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// -------------------------------------------------------------------
// PHASE 3 — GATE-IN → RECEPTION → MANAGER ASSIGNMENT PIPELINE TABLES
// -------------------------------------------------------------------

export const tbl_reception_intake = mysqlTable('tbl_reception_intake', {
  intake_id: varchar('intake_id', { length: 50 }).primaryKey(),
  gate_entry_id: varchar('gate_entry_id', { length: 50 }).notNull(),
  vos_id: varchar('vos_id', { length: 50 }),
  token_number: varchar('token_number', { length: 50 }).notNull(),
  accepted_by: varchar('accepted_by', { length: 50 }).notNull(),
  accepted_at: timestamp('accepted_at').defaultNow(),
  original_odometer: int('original_odometer'),
  confirmed_odometer: int('confirmed_odometer'),
  odometer_corrected: boolean('odometer_corrected').default(false),
  correction_reason: text('correction_reason'),
  visit_category: varchar('visit_category', { length: 100 }).notNull(),
  preliminary_complaints: text('preliminary_complaints'),
  branch_id: varchar('branch_id', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('INTAKE_COMPLETED')
});

export const tbl_manager_assignment = mysqlTable('tbl_manager_assignment', {
  assignment_id: varchar('assignment_id', { length: 50 }).primaryKey(),
  intake_id: varchar('intake_id', { length: 50 }).notNull(),
  gate_entry_id: varchar('gate_entry_id', { length: 50 }).notNull(),
  vos_id: varchar('vos_id', { length: 50 }),
  job_card_id: varchar('job_card_id', { length: 50 }),
  assigned_sa_id: varchar('assigned_sa_id', { length: 50 }).notNull(),
  assigned_sa_name: varchar('assigned_sa_name', { length: 100 }).notNull(),
  assigning_manager_id: varchar('assigning_manager_id', { length: 50 }).notNull(),
  assigned_at: timestamp('assigned_at').defaultNow(),
  recommendation_sa_id: varchar('recommendation_sa_id', { length: 50 }),
  recommendation_reason: text('recommendation_reason'),
  is_override: boolean('is_override').default(false),
  override_reason: text('override_reason'),
  branch_id: varchar('branch_id', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('ASSIGNED')
});

export const tbl_handoff_sla = mysqlTable('tbl_handoff_sla', {
  handoff_id: varchar('handoff_id', { length: 50 }).primaryKey(),
  stage_name: varchar('stage_name', { length: 50 }).notNull(),
  entity_id: varchar('entity_id', { length: 50 }).notNull(),
  owner_id: varchar('owner_id', { length: 50 }).notNull(),
  owner_role: varchar('owner_role', { length: 50 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  accepted_at: timestamp('accepted_at'),
  sla_due_at: timestamp('sla_due_at').notNull(),
  status: varchar('status', { length: 50 }).default('ON_TRACK'),
  escalation_level: int('escalation_level').default(0),
  escalated_at: timestamp('escalated_at'),
  branch_id: varchar('branch_id', { length: 50 }).notNull()
});

// -------------------------------------------------------------------
// PHASE 4 — SERVICE ADVISOR TECHNICAL INTAKE & JC CREATION TABLES
// -------------------------------------------------------------------

export const tbl_sa_intake = mysqlTable('tbl_sa_intake', {
  intake_id: varchar('intake_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }),
  gate_entry_id: varchar('gate_entry_id', { length: 50 }).notNull(),
  vos_id: varchar('vos_id', { length: 50 }),
  sa_id: varchar('sa_id', { length: 50 }).notNull(),
  sa_name: varchar('sa_name', { length: 100 }).notNull(),
  gate_odometer: int('gate_odometer'),
  reception_odometer: int('reception_odometer'),
  sa_verified_odometer: int('sa_verified_odometer').notNull(),
  odometer_corrected: boolean('odometer_corrected').default(false),
  correction_reason: text('correction_reason'),
  complaint_source: varchar('complaint_source', { length: 100 }).notNull(),
  authenticated_by: varchar('authenticated_by', { length: 100 }).notNull(),
  authenticated_at: timestamp('authenticated_at').defaultNow(),
  authenticated_complaints_json: text('authenticated_complaints_json').notNull(),
  fsv_status: varchar('fsv_status', { length: 50 }).default('DATA_UNAVAILABLE'),
  warranty_prescreen_status: varchar('warranty_prescreen_status', { length: 50 }).default('INSUFFICIENT_DATA'),
  job_scope_json: text('job_scope_json'),
  jc_type: varchar('jc_type', { length: 50 }).notNull().default('DWIP_TEMP'),
  reconciled_crm_jc_no: varchar('reconciled_crm_jc_no', { length: 50 }),
  reconciled_at: timestamp('reconciled_at'),
  branch_id: varchar('branch_id', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('INTAKE_STARTED'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

export const tbl_complaint_amendment_audit = mysqlTable('tbl_complaint_amendment_audit', {
  audit_id: varchar('audit_id', { length: 50 }).primaryKey(),
  intake_id: varchar('intake_id', { length: 50 }).notNull(),
  job_card_id: varchar('job_card_id', { length: 50 }),
  previous_complaints_json: text('previous_complaints_json').notNull(),
  new_complaints_json: text('new_complaints_json').notNull(),
  amended_by: varchar('amended_by', { length: 100 }).notNull(),
  amended_at: timestamp('amended_at').defaultNow(),
  amendment_reason: text('amendment_reason').notNull(),
  branch_id: varchar('branch_id', { length: 50 }).notNull()
});

// -------------------------------------------------------------------
// PHASE 5 — FLOOR CONTROL, BAY/TECHNICIAN ALLOCATION & REPAIR TABLES
// -------------------------------------------------------------------

export const tbl_bays = mysqlTable('tbl_bays', {
  bay_id: varchar('bay_id', { length: 50 }).primaryKey(),
  bay_name: varchar('bay_name', { length: 100 }).notNull(),
  bay_type: varchar('bay_type', { length: 50 }).notNull().default('GENERAL'),
  lob_suitability: varchar('lob_suitability', { length: 50 }).default('ALL'),
  status: varchar('status', { length: 50 }).notNull().default('AVAILABLE'),
  current_job_card_id: varchar('current_job_card_id', { length: 50 }),
  current_vrn: varchar('current_vrn', { length: 50 }),
  occupied_since: timestamp('occupied_since'),
  branch_id: varchar('branch_id', { length: 50 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

export const tbl_job_allocations = mysqlTable('tbl_job_allocations', {
  allocation_id: varchar('allocation_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  gate_entry_id: varchar('gate_entry_id', { length: 50 }),
  vos_id: varchar('vos_id', { length: 50 }),
  bay_id: varchar('bay_id', { length: 50 }).notNull(),
  technician_id: varchar('technician_id', { length: 50 }).notNull(),
  technician_name: varchar('technician_name', { length: 100 }).notNull(),
  allocated_by: varchar('allocated_by', { length: 100 }).notNull(),
  allocated_at: timestamp('allocated_at').defaultNow(),
  status: varchar('status', { length: 50 }).default('ACTIVE'),
  recommendation_bay_id: varchar('recommendation_bay_id', { length: 50 }),
  recommendation_tech_id: varchar('recommendation_tech_id', { length: 50 }),
  is_override: boolean('is_override').default(false),
  override_reason: text('override_reason'),
  branch_id: varchar('branch_id', { length: 50 }).notNull()
});

export const tbl_repair_executions = mysqlTable('tbl_repair_executions', {
  execution_id: varchar('execution_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  operation_id: varchar('operation_id', { length: 50 }).notNull(),
  operation_name: varchar('operation_name', { length: 255 }).notNull(),
  technician_id: varchar('technician_id', { length: 50 }).notNull(),
  technician_name: varchar('technician_name', { length: 100 }).notNull(),
  bay_id: varchar('bay_id', { length: 50 }),
  status: varchar('status', { length: 50 }).default('NOT_STARTED'),
  planned_duration_mins: int('planned_duration_mins').default(60),
  started_at: timestamp('started_at'),
  paused_at: timestamp('paused_at'),
  accumulated_productive_seconds: int('accumulated_productive_seconds').default(0),
  accumulated_paused_seconds: int('accumulated_paused_seconds').default(0),
  pause_reason: varchar('pause_reason', { length: 100 }),
  completed_at: timestamp('completed_at'),
  additional_findings_count: int('additional_findings_count').default(0),
  branch_id: varchar('branch_id', { length: 50 }).notNull()
});

export const tbl_parts_requests = mysqlTable('tbl_parts_requests', {
  request_id: varchar('request_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  vrn: varchar('vrn', { length: 50 }).notNull(),
  operation_id: varchar('operation_id', { length: 50 }),
  part_code: varchar('part_code', { length: 100 }),
  part_description: text('part_description').notNull(),
  quantity: int('quantity').notNull().default(1),
  urgency: varchar('urgency', { length: 50 }).default('NORMAL'),
  requested_by: varchar('requested_by', { length: 100 }).notNull(),
  requested_at: timestamp('requested_at').defaultNow(),
  status: varchar('status', { length: 50 }).default('PENDING'),
  parts_user_response: text('parts_user_response'),
  responded_at: timestamp('responded_at'),
  acknowledged_by: varchar('acknowledged_by', { length: 100 }),
  acknowledged_at: timestamp('acknowledged_at'),
  fulfilled_by: varchar('fulfilled_by', { length: 100 }),
  fulfilled_at: timestamp('fulfilled_at'),
  stock_reservation_id: varchar('stock_reservation_id', { length: 50 }),
  goods_issue_id: varchar('goods_issue_id', { length: 50 }),
  rejection_reason: text('rejection_reason'),
  expected_date: timestamp('expected_date'),
  branch_id: varchar('branch_id', { length: 50 }).notNull()
});

export const tbl_warranty_reviews = mysqlTable('tbl_warranty_reviews', {
  review_id: varchar('review_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  vrn: varchar('vrn', { length: 50 }).notNull(),
  vin: varchar('vin', { length: 50 }),
  complaint: text('complaint').notNull(),
  diagnosis: text('diagnosis'),
  failed_part: varchar('failed_part', { length: 100 }),
  requested_by: varchar('requested_by', { length: 100 }).notNull(),
  requested_at: timestamp('requested_at').defaultNow(),
  status: varchar('status', { length: 50 }).default('PENDING'),
  acknowledged_by: varchar('acknowledged_by', { length: 100 }),
  acknowledged_at: timestamp('acknowledged_at'),
  eligibility_check_result: varchar('eligibility_check_result', { length: 50 }),
  document_gaps_json: text('document_gaps_json'),
  warranty_claim_id: varchar('warranty_claim_id', { length: 50 }),
  rejection_reason: text('rejection_reason'),
  adjudicated_by: varchar('adjudicated_by', { length: 100 }),
  adjudicated_at: timestamp('adjudicated_at'),
  adjudication_notes: text('adjudication_notes'),
  branch_id: varchar('branch_id', { length: 50 }).notNull()
});

export const tbl_additional_findings = mysqlTable('tbl_additional_findings', {
  finding_id: varchar('finding_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  vrn: varchar('vrn', { length: 50 }).notNull(),
  finding_text: text('finding_text').notNull(),
  photo_url: text('photo_url'),
  recommended_work: text('recommended_work'),
  required_part: varchar('required_part', { length: 100 }),
  estimated_additional_mins: int('estimated_additional_mins').default(30),
  requires_customer_approval: boolean('requires_customer_approval').default(true),
  approval_status: varchar('approval_status', { length: 50 }).default('PENDING'),
  identified_by: varchar('identified_by', { length: 100 }).notNull(),
  identified_at: timestamp('identified_at').defaultNow(),
  branch_id: varchar('branch_id', { length: 50 }).notNull()
});

export const tbl_eta_extensions = mysqlTable('tbl_eta_extensions', {
  extension_id: varchar('extension_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  old_eta: timestamp('old_eta').notNull(),
  new_eta: timestamp('new_eta').notNull(),
  excess_minutes: int('excess_minutes').notNull(),
  reason: text('reason').notNull(),
  requested_by: varchar('requested_by', { length: 100 }).notNull(),
  requested_at: timestamp('requested_at').defaultNow(),
  approval_level: varchar('approval_level', { length: 50 }).notNull().default('NORMAL'),
  approved_by: varchar('approved_by', { length: 100 }),
  approved_at: timestamp('approved_at'),
  status: varchar('status', { length: 50 }).default('PENDING'),
  extension_count: int('extension_count').default(1),
  branch_id: varchar('branch_id', { length: 50 }).notNull()
});

export const tbl_qc_handoff = mysqlTable('tbl_qc_handoff', {
  handoff_id: varchar('handoff_id', { length: 50 }).primaryKey(),
  job_card_id: varchar('job_card_id', { length: 50 }).notNull(),
  vrn: varchar('vrn', { length: 50 }).notNull(),
  floor_incharge_id: varchar('floor_incharge_id', { length: 50 }).notNull(),
  qc_incharge_id: varchar('qc_incharge_id', { length: 50 }),
  completed_at: timestamp('completed_at').defaultNow(),
  validation_status: varchar('validation_status', { length: 50 }).default('PASSED'),
  status: varchar('status', { length: 50 }).default('PENDING_QC'),
  acknowledged_at: timestamp('acknowledged_at'),
  branch_id: varchar('branch_id', { length: 50 }).notNull()
});

// Phase 9: Cashier & Security Gate Out Schema

export const tbl_payments = mysqlTable('tbl_payments', {
  payment_id: varchar('payment_id', { length: 50 }).primaryKey(),
  job_id: varchar('job_id', { length: 50 }).notNull(),
  branch_id: varchar('branch_id', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  payment_mode: varchar('payment_mode', { length: 50 }).notNull(), // CASH, UPI, NEFT, RTGS, IMPS, CARD, CHEQUE
  reference_number: varchar('reference_number', { length: 255 }), // Required for non-cash
  cashier_id: varchar('cashier_id', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('COMPLETED'),
  recorded_at: timestamp('recorded_at').defaultNow()
});

export const tbl_credit_requests = mysqlTable('tbl_credit_requests', {
  credit_request_id: varchar('credit_request_id', { length: 50 }).primaryKey(),
  job_id: varchar('job_id', { length: 50 }).notNull(),
  branch_id: varchar('branch_id', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }), // Can be null if authoritative amount from CRM is used
  reason: text('reason').notNull(),
  requested_by: varchar('requested_by', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('REQUESTED'), // REQUESTED, GM_APPROVED, GM_REJECTED
  gm_id: varchar('gm_id', { length: 50 }),
  requested_at: timestamp('requested_at').defaultNow(),
  decision_at: timestamp('decision_at')
});

export const tbl_gate_pass = mysqlTable('tbl_gate_pass', {
  gate_pass_id: varchar('gate_pass_id', { length: 50 }).primaryKey(),
  gate_pass_no: varchar('gate_pass_no', { length: 100 }).notNull().unique(),
  job_id: varchar('job_id', { length: 50 }).notNull(),
  branch_id: varchar('branch_id', { length: 50 }).notNull(),
  release_basis: varchar('release_basis', { length: 50 }).notNull(), // PAID, CREDIT_APPROVED, MANUAL_GATE_PASS
  payment_id: varchar('payment_id', { length: 50 }),
  credit_request_id: varchar('credit_request_id', { length: 50 }),
  manual_gate_pass_request_id: varchar('manual_gate_pass_request_id', { length: 50 }),
  is_manual_exception: boolean('is_manual_exception').default(false),
  status: varchar('status', { length: 50 }).default('ISSUED'), // ISSUED, VERIFIED, REVOKED
  issued_by: varchar('issued_by', { length: 50 }).notNull(),
  issued_at: timestamp('issued_at').defaultNow(),
  revoked_by: varchar('revoked_by', { length: 50 }),
  revoked_at: timestamp('revoked_at'),
  revoke_reason: text('revoke_reason')
});

export const tbl_gate_out = mysqlTable('tbl_gate_out', {
  gate_out_id: varchar('gate_out_id', { length: 50 }).primaryKey(),
  gate_pass_id: varchar('gate_pass_id', { length: 50 }).notNull(),
  job_id: varchar('job_id', { length: 50 }).notNull(),
  branch_id: varchar('branch_id', { length: 50 }).notNull(),
  security_operator_id: varchar('security_operator_id', { length: 50 }).notNull(),
  evidence_id: varchar('evidence_id', { length: 50 }), // Linking to tbl_evidence
  capture_source: varchar('capture_source', { length: 50 }).default('MANUAL_CAMERA'), // ANPR, MANUAL_CAMERA
  expected_vrn: varchar('expected_vrn', { length: 50 }),
  detected_vrn: varchar('detected_vrn', { length: 50 }),
  verification_result: varchar('verification_result', { length: 50 }).default('VERIFIED'), // MATCH, MANUAL_OVERRIDE
  verified_by: varchar('verified_by', { length: 50 }), 
  gate_out_time: timestamp('gate_out_time').defaultNow()
});
