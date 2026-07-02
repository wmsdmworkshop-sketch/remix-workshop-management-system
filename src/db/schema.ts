import { mysqlTable, serial, text, int, boolean, timestamp, decimal } from "drizzle-orm/mysql-core";

export const pgTable = mysqlTable;
export const integer = int;

// Users table (required by cloudsql-setup)
export const users = pgTable("users", {
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
export const employees = pgTable("employees", {
  employee_id: integer("employee_id").primaryKey(),
  full_name: text("full_name").notNull(),
  employee_code: text("employee_code").notNull(),
  role: text("role").notNull(),
  employee_grade: text("employee_grade").notNull(),
  basic_salary: integer("basic_salary").notNull(),
  mobile: text("mobile").notNull(),
  is_active: boolean("is_active").notNull(),
  created_at: text("created_at"),
  allocated_revenue: integer("allocated_revenue"),
  target_revenue: integer("target_revenue"),
  paid_pct: text("paid_pct"),
  tml_claim_pct: text("tml_claim_pct"),
});

// Bays
export const bays = pgTable("bays", {
  bay_id: integer("bay_id").primaryKey(),
  bay_code: text("bay_code").notNull(),
  bay_name: text("bay_name").notNull(),
  bay_type: text("bay_type").notNull(),
  status: text("status").notNull(),
  is_active: boolean("is_active").notNull(),
});

// SRTypes
export const srTypes = pgTable("sr_types", {
  sr_type_id: integer("sr_type_id").primaryKey(),
  sr_type_code: text("sr_type_code").notNull(),
  sr_type_name: text("sr_type_name").notNull(),
  default_duration_mins: integer("default_duration_mins").notNull(),
  is_active: boolean("is_active").notNull(),
});

// RevenueSplits
export const revenueSplits = pgTable("revenue_splits", {
  split_id: integer("split_id").primaryKey(),
  combination_code: text("combination_code").notNull(),
  combination_label: text("combination_label").notNull(),
  person_count: integer("person_count").notNull(),
  tech_pct: integer("tech_pct").notNull(),
  co_tech_pct: integer("co_tech_pct").notNull(),
  electrician_pct: integer("electrician_pct").notNull(),
  add_tech_pct: integer("add_tech_pct").notNull(),
  uses_salary_wt: boolean("uses_salary_wt").notNull(),
  senior_override: boolean("senior_override").notNull(),
  notes: text("notes"),
  is_active: boolean("is_active").notNull(),
});

// JobCards
export const jobCards = pgTable("job_cards", {
  job_id: integer("job_id").primaryKey(),
  job_card_no: text("job_card_no").notNull(),
  vrn: text("vrn").notNull(),
  customer_name: text("customer_name").notNull(),
  customer_mobile: text("customer_mobile").notNull(),
  vehicle_make: text("vehicle_make").notNull(),
  vehicle_model: text("vehicle_model").notNull(),
  vehicle_year: integer("vehicle_year").notNull(),
  km_reading: integer("km_reading").notNull(),
  sr_type_id: integer("sr_type_id").notNull(),
  job_description: text("job_description").notNull(),
  priority: text("priority").notNull(),
  bay_id: integer("bay_id"),
  status: text("status").notNull(),
  etd: text("etd").notNull(),
  started_at: text("started_at"),
  completed_at: text("completed_at"),
  invoiced_at: text("invoiced_at"),
  created_by: integer("created_by").notNull(),
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
  no_of_laborers: integer("no_of_laborers"),
  actual_time_taken: text("actual_time_taken"),
  numberplate_photo: text("numberplate_photo"),
  odometer_photo: text("odometer_photo"),
  chassis_number: text("chassis_number"),
  driver_name: text("driver_name"),
  driver_mobile: text("driver_mobile"),
  driver_image: text("driver_image"),
  token_number: text("token_number"),
  waiting_time_mins: integer("waiting_time_mins"),
  progress_pct: integer("progress_pct"),
  parts_price: integer("parts_price"),
  labor_price: integer("labor_price"),
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
});

// user_access_master table definition
export const userAccessMaster = pgTable("user_access_master", {
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
export const rolePermissions = pgTable("role_permissions", {
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
export const fsbMaster = pgTable("fsb_master", {
  fsb_id: int("fsb_id").primaryKey().autoincrement(),
  job_card_id: int("job_card_id"),
  fsb_status: text("fsb_status"),
});

// Gate Entries table
export const gateEntries = pgTable("gate_entries", {
  gate_id: integer("gate_id").primaryKey(),
  token_number: text("token_number").notNull(),
  vrn: text("vrn").notNull(),
  vehicle_model: text("vehicle_model").notNull(),
  chassis_number: text("chassis_number").notNull(),
  km_reading: integer("km_reading").notNull(),
  driver_name: text("driver_name").notNull(),
  driver_mobile: text("driver_mobile").notNull(),
  driver_image: text("driver_image"),
  waiting_time_mins: integer("waiting_time_mins").notNull(),
  status: text("status").notNull(),
  created_at: text("created_at").notNull(),
});

// JobTechnicianMaps
export const jobTechnicianMaps = pgTable("job_technician_maps", {
  map_id: integer("map_id").primaryKey(),
  job_id: integer("job_id").notNull(),
  employee_id: integer("employee_id").notNull(),
  tech_role: text("tech_role").notNull(),
  assigned_at: text("assigned_at"),
});

// JobRevenues
export const jobRevenues = pgTable("job_revenues", {
  revenue_id: integer("revenue_id").primaryKey(),
  job_id: integer("job_id").notNull(),
  labour_amount: integer("labour_amount").notNull(),
  parts_amount: integer("parts_amount").notNull(),
  total_amount: integer("total_amount").notNull(),
  split_id: integer("split_id").notNull(),
  calculated_at: text("calculated_at"),
});

// JobRevenueSplitDetails
export const jobRevenueSplitDetails = pgTable("job_revenue_split_details", {
  detail_id: integer("detail_id").primaryKey(),
  revenue_id: integer("revenue_id").notNull(),
  employee_id: integer("employee_id").notNull(),
  tech_role: text("tech_role").notNull(),
  split_pct: integer("split_pct").notNull(),
  split_amount: integer("split_amount").notNull(),
});

// CarryForwardLogs
export const carryForwardLogs = pgTable("carry_forward_logs", {
  cf_id: integer("cf_id").primaryKey(),
  job_id: integer("job_id").notNull(),
  cf_reason: text("cf_reason").notNull(),
  raised_by: integer("raised_by").notNull(),
  approved_by: integer("approved_by"),
  cf_status: text("cf_status").notNull(),
  raised_at: text("raised_at").notNull(),
  actioned_at: text("actioned_at"),
});

// ReworkLogs
export const reworkLogs = pgTable("rework_logs", {
  rework_id: integer("rework_id").primaryKey(),
  original_job_id: integer("original_job_id").notNull(),
  new_job_id: integer("new_job_id"),
  rework_reason: text("rework_reason").notNull(),
  original_tech_id: integer("original_tech_id").notNull(),
  raised_by: integer("raised_by").notNull(),
  approved_by: integer("approved_by"),
  rework_status: text("rework_status").notNull(),
  raised_at: text("raised_at").notNull(),
  actioned_at: text("actioned_at"),
});

// AlertConfigs
export const alertConfigs = pgTable("alert_configs", {
  alert_config_id: integer("alert_config_id").primaryKey(),
  alert_code: text("alert_code").notNull(),
  alert_name: text("alert_name").notNull(),
  alert_category: text("alert_category").notNull(),
  trigger_condition: text("trigger_condition").notNull(),
  threshold_value: integer("threshold_value").notNull(),
  threshold_unit: text("threshold_unit").notNull(),
  severity: text("severity").notNull(),
  is_active: boolean("is_active").notNull(),
});

// AlertLogs
export const alertLogs = pgTable("alert_logs", {
  alert_id: integer("alert_id").primaryKey(),
  alert_config_id: integer("alert_config_id").notNull(),
  entity_type: text("entity_type").notNull(),
  entity_id: integer("entity_id").notNull(),
  alert_message: text("alert_message").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  acknowledged_by: integer("acknowledged_by"),
  acknowledged_at: text("acknowledged_at"),
  resolved_at: text("resolved_at"),
  created_at: text("created_at").notNull(),
});

// DMSImportBatches
export const dmsImportBatches = pgTable("dms_import_batches", {
  batch_id: integer("batch_id").primaryKey(),
  imported_by: integer("imported_by").notNull(),
  file_name: text("file_name").notNull(),
  total_rows: integer("total_rows").notNull(),
  matched_rows: integer("matched_rows").notNull(),
  unmatched_rows: integer("unmatched_rows").notNull(),
  status: text("status").notNull(),
  imported_at: text("imported_at").notNull(),
});

// DMSImportRows
export const dmsImportRows = pgTable("dms_import_rows", {
  row_id: integer("row_id").primaryKey(),
  batch_id: integer("batch_id").notNull(),
  row_number: integer("row_number").notNull(),
  vrn: text("vrn").notNull(),
  job_date: text("job_date").notNull(),
  sr_type: text("sr_type").notNull(),
  labour_amount: integer("labour_amount").notNull(),
  parts_amount: integer("parts_amount").notNull(),
  total_amount: integer("total_amount").notNull(),
  matched_job_id: integer("matched_job_id"),
  match_status: text("match_status").notNull(),
  conflict_reason: text("conflict_reason"),
  resolved_by: integer("resolved_by"),
  resolved_at: text("resolved_at"),
  raw_data: text("raw_data"),
});

// JobRevenueSplit
export const jobRevenueSplit = pgTable("job_revenue_split", {
  id: serial("id").primaryKey(),
  job_id: integer("job_id").notNull(),
  employee_id: integer("employee_id").notNull(),
  allocated_amount: decimal("allocated_amount", { precision: 10, scale: 2 }).notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// TechnicianKpiDaily
export const technicianKpiDaily = pgTable("technician_kpi_daily", {
  id: serial("id").primaryKey(),
  employee_id: integer("employee_id").notNull(),
  kpi_date: text("kpi_date").notNull(),
  jobs_assigned: integer("jobs_assigned").notNull(),
  jobs_completed: integer("jobs_completed").notNull(),
  jobs_open: integer("jobs_open").notNull(),
  revenue_earned: decimal("revenue_earned", { precision: 10, scale: 2 }).notNull(),
  avg_job_duration: integer("avg_job_duration").notNull(),
  completion_efficiency: decimal("completion_efficiency", { precision: 5, scale: 2 }).notNull(),
  utilization_percent: decimal("utilization_percent", { precision: 5, scale: 2 }).notNull(),
  rework_count: integer("rework_count").notNull(),
  rework_percent: decimal("rework_percent", { precision: 5, scale: 2 }).notNull(),
  tml_claims: integer("tml_claims").notNull(),
  tml_claim_rate: decimal("tml_claim_rate", { precision: 5, scale: 2 }).notNull(),
  avg_revenue_per_job: decimal("avg_revenue_per_job", { precision: 10, scale: 2 }).notNull(),
  on_time_completion: decimal("on_time_completion", { precision: 5, scale: 2 }).notNull(),
  quality_score: decimal("quality_score", { precision: 5, scale: 2 }).notNull(),
  idle_time: integer("idle_time").notNull(),
  break_time: integer("break_time").notNull(),
  overtime_hours: decimal("overtime_hours", { precision: 5, scale: 2 }).notNull(),
  health_status: text("health_status").notNull(), // 'GREEN' | 'AMBER' | 'RED'
  created_at: timestamp("created_at").defaultNow(),
});

// ProductivityAlerts
export const productivityAlerts = pgTable("productivity_alerts", {
  id: serial("id").primaryKey(),
  employee_id: integer("employee_id").notNull(),
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
export const reworkTracking = pgTable("rework_tracking", {
  id: serial("id").primaryKey(),
  original_job_id: integer("original_job_id").notNull(),
  rework_job_id: integer("rework_job_id").notNull(),
  vehicle_reg: text("vehicle_reg").notNull(),
  assigned_technician_id: integer("assigned_technician_id").notNull(),
  original_closure_date: timestamp("original_closure_date").notNull(),
  rework_date: timestamp("rework_date").notNull(),
  days_since_original: integer("days_since_original").notNull(),
  original_issue: text("original_issue").notNull(),
  rework_reason: text("rework_reason").notNull(),
  rework_completed: boolean("rework_completed").notNull(),
  rework_revenue: decimal("rework_revenue", { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

