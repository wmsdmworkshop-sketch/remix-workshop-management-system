-- ==========================================
-- Database Schema for Devanand Workforce App
-- Target RDBMS: MySQL (Cloud SQL)
-- DDL generated from Drizzle schema definition
-- ==========================================

-- 1. Users Master Table
CREATE TABLE `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(255) NULL,
  `username` VARCHAR(255) NULL,
  `password_hash` TEXT NULL,
  `role` VARCHAR(100) NULL,
  `employee_id` INT NULL,
  `is_active` TINYINT(1) NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_login` TIMESTAMP NULL,
  `password_plain` TEXT NULL,
  `date_of_joining` VARCHAR(50) NULL,
  `dob` VARCHAR(50) NULL,
  `qualification` VARCHAR(255) NULL,
  `designation` VARCHAR(255) NULL,
  `grade` VARCHAR(50) NULL,
  `floor_team` VARCHAR(100) NULL,
  `clerical_team` VARCHAR(100) NULL,
  `emp_id` VARCHAR(50) NULL,
  `mobile_no` VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Employees Details
CREATE TABLE `employees` (
  `employee_id` INT PRIMARY KEY,
  `full_name` VARCHAR(255) NOT NULL,
  `employee_code` VARCHAR(50) NOT NULL,
  `role` VARCHAR(100) NOT NULL,
  `employee_grade` VARCHAR(50) NOT NULL,
  `basic_salary` INT NOT NULL,
  `mobile` VARCHAR(50) NOT NULL,
  `is_active` TINYINT(1) NOT NULL,
  `created_at` VARCHAR(50) NULL,
  `allocated_revenue` INT NULL,
  `target_revenue` INT NULL,
  `paid_pct` VARCHAR(10) NULL,
  `tml_claim_pct` VARCHAR(10) NULL,
  `department` VARCHAR(255) NULL,
  `workshop_id` INT NULL,
  `shift_id` INT NULL,
  `joining_date` VARCHAR(50) NULL,
  `profile_photo_url` TEXT NULL,
  `face_embedding_reference` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Workshop Bays
CREATE TABLE `bays` (
  `bay_id` INT PRIMARY KEY,
  `bay_code` VARCHAR(50) NOT NULL,
  `bay_name` VARCHAR(255) NOT NULL,
  `bay_type` VARCHAR(100) NOT NULL,
  `status` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Service Request Types
CREATE TABLE `sr_types` (
  `sr_type_id` INT PRIMARY KEY,
  `sr_type_code` VARCHAR(50) NOT NULL,
  `sr_type_name` VARCHAR(255) NOT NULL,
  `default_duration_mins` INT NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Revenue Splits Logic Configurations
CREATE TABLE `revenue_splits` (
  `split_id` INT PRIMARY KEY,
  `combination_code` VARCHAR(100) NOT NULL,
  `combination_label` VARCHAR(255) NOT NULL,
  `person_count` INT NOT NULL,
  `tech_pct` INT NOT NULL,
  `co_tech_pct` INT NOT NULL,
  `electrician_pct` INT NOT NULL,
  `add_tech_pct` INT NOT NULL,
  `uses_salary_wt` TINYINT(1) NOT NULL,
  `senior_override` TINYINT(1) NOT NULL,
  `notes` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Core Job Cards Table
CREATE TABLE `job_cards` (
  `job_id` INT PRIMARY KEY,
  `job_card_no` VARCHAR(100) NOT NULL,
  `vrn` VARCHAR(50) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_mobile` VARCHAR(50) NOT NULL,
  `vehicle_make` VARCHAR(100) NOT NULL,
  `vehicle_model` VARCHAR(100) NOT NULL,
  `vehicle_year` INT NOT NULL,
  `km_reading` INT NOT NULL,
  `sr_type_id` INT NOT NULL,
  `job_description` TEXT NOT NULL,
  `priority` VARCHAR(50) NOT NULL,
  `bay_id` INT NULL,
  `status` VARCHAR(100) NOT NULL,
  `etd` VARCHAR(50) NOT NULL,
  `started_at` VARCHAR(50) NULL,
  `completed_at` VARCHAR(50) NULL,
  `invoiced_at` VARCHAR(50) NULL,
  `created_by` INT NOT NULL,
  `created_at` VARCHAR(50) NOT NULL,
  `updated_at` VARCHAR(50) NULL,
  `workshop_stage` VARCHAR(100) NULL,
  `l1_delay` VARCHAR(100) NULL,
  `l2_delay` VARCHAR(100) NULL,
  `l3_delay` VARCHAR(100) NULL,
  `l5_delay` VARCHAR(100) NULL,
  `delay_notes` TEXT NULL,
  `time_slot` VARCHAR(100) NULL,
  `tat_status` VARCHAR(100) NULL,
  `pending_reason` TEXT NULL,
  `remarks` TEXT NULL,
  `date_in` VARCHAR(50) NULL,
  `time_in` VARCHAR(50) NULL,
  `expected_date_out` VARCHAR(50) NULL,
  `expected_time_of_completion` VARCHAR(50) NULL,
  `time_out` VARCHAR(50) NULL,
  `date_completed` VARCHAR(50) NULL,
  `bay_no` VARCHAR(50) NULL,
  `service_advisor` VARCHAR(255) NULL,
  `technician_name` VARCHAR(255) NULL,
  `no_of_laborers` INT NULL,
  `actual_time_taken` VARCHAR(50) NULL,
  `numberplate_photo` TEXT NULL,
  `odometer_photo` TEXT NULL,
  `chassis_number` VARCHAR(100) NULL,
  `driver_name` VARCHAR(255) NULL,
  `driver_mobile` VARCHAR(50) NULL,
  `driver_image` TEXT NULL,
  `token_number` VARCHAR(50) NULL,
  `waiting_time_mins` INT NULL,
  `progress_pct` INT NULL,
  `parts_price` INT NULL,
  `labor_price` INT NULL,
  `parts_status` VARCHAR(100) NULL,
  `parts_list` TEXT NULL,
  `parts_images` TEXT NULL,
  `warranty_status` VARCHAR(100) NULL,
  `payment_method` VARCHAR(100) NULL,
  `payment_reference` VARCHAR(255) NULL,
  `gate_pass_issued` TINYINT(1) NULL,
  `exited_at` VARCHAR(50) NULL,
  `invoice_no` VARCHAR(100) NULL,
  `gate_out_time` VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. User Access Credentials Master
CREATE TABLE `user_access_master` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NULL,
  `username` VARCHAR(255) NULL,
  `email` VARCHAR(255) NULL,
  `user_role` VARCHAR(100) NULL,
  `access_level` INT NULL,
  `is_active` TINYINT(1) NULL,
  `created_at` TIMESTAMP NULL,
  `mobile_no` VARCHAR(50) NOT NULL,
  `password_hash` TEXT NULL,
  `otp_hash` TEXT NULL,
  `otp_expiry` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Module Permissions Matrix
CREATE TABLE `role_permissions` (
  `permission_id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_name` VARCHAR(100) NULL,
  `module_name` VARCHAR(100) NULL,
  `can_view` TINYINT(1) NULL,
  `can_edit` TINYINT(1) NULL,
  `can_comment` TINYINT(1) NULL,
  `updated_by` INT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Field Service Bulletin (FSB) Tracking
CREATE TABLE `fsb_master` (
  `fsb_id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_card_id` INT NULL,
  `fsb_status` VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Gate Entries Registration
CREATE TABLE `gate_entries` (
  `gate_id` INT PRIMARY KEY,
  `token_number` VARCHAR(50) NOT NULL,
  `vrn` VARCHAR(50) NOT NULL,
  `vehicle_model` VARCHAR(100) NOT NULL,
  `chassis_number` VARCHAR(100) NOT NULL,
  `km_reading` INT NOT NULL,
  `driver_name` VARCHAR(255) NOT NULL,
  `driver_mobile` VARCHAR(50) NOT NULL,
  `driver_image` TEXT NULL,
  `waiting_time_mins` INT NOT NULL,
  `status` VARCHAR(100) NOT NULL,
  `created_at` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Job Technician Mapping Table
CREATE TABLE `job_technician_maps` (
  `map_id` INT PRIMARY KEY,
  `job_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `tech_role` VARCHAR(100) NOT NULL,
  `assigned_at` VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Job Revenue Calculation Records
CREATE TABLE `job_revenues` (
  `revenue_id` INT PRIMARY KEY,
  `job_id` INT NOT NULL,
  `labour_amount` INT NOT NULL,
  `parts_amount` INT NOT NULL,
  `total_amount` INT NOT NULL,
  `split_id` INT NOT NULL,
  `calculated_at` VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Revenue Splits Allocation Split details
CREATE TABLE `job_revenue_split_details` (
  `detail_id` INT PRIMARY KEY,
  `revenue_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `tech_role` VARCHAR(100) NOT NULL,
  `split_pct` INT NOT NULL,
  `split_amount` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Carry Forward Audit Log
CREATE TABLE `carry_forward_logs` (
  `cf_id` INT PRIMARY KEY,
  `job_id` INT NOT NULL,
  `cf_reason` TEXT NOT NULL,
  `raised_by` INT NOT NULL,
  `approved_by` INT NULL,
  `cf_status` VARCHAR(100) NOT NULL,
  `raised_at` VARCHAR(50) NOT NULL,
  `actioned_at` VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Rework Repair Tracker logs
CREATE TABLE `rework_logs` (
  `rework_id` INT PRIMARY KEY,
  `original_job_id` INT NOT NULL,
  `new_job_id` INT NULL,
  `rework_reason` TEXT NOT NULL,
  `original_tech_id` INT NOT NULL,
  `raised_by` INT NOT NULL,
  `approved_by` INT NULL,
  `rework_status` VARCHAR(100) NOT NULL,
  `raised_at` VARCHAR(50) NOT NULL,
  `actioned_at` VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Alert Configurations Rules
CREATE TABLE `alert_configs` (
  `alert_config_id` INT PRIMARY KEY,
  `alert_code` VARCHAR(50) NOT NULL,
  `alert_name` VARCHAR(255) NOT NULL,
  `alert_category` VARCHAR(100) NOT NULL,
  `trigger_condition` VARCHAR(255) NOT NULL,
  `threshold_value` INT NOT NULL,
  `threshold_unit` VARCHAR(50) NOT NULL,
  `severity` VARCHAR(50) NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Generated Alerts log
CREATE TABLE `alert_logs` (
  `alert_id` INT PRIMARY KEY,
  `alert_config_id` INT NOT NULL,
  `entity_type` VARCHAR(100) NOT NULL,
  `entity_id` INT NOT NULL,
  `alert_message` TEXT NOT NULL,
  `severity` VARCHAR(50) NOT NULL,
  `status` VARCHAR(100) NOT NULL,
  `acknowledged_by` INT NULL,
  `acknowledged_at` VARCHAR(50) NULL,
  `resolved_at` VARCHAR(50) NULL,
  `created_at` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. DMS CSV Import Sessions Tracker
CREATE TABLE `dms_import_batches` (
  `batch_id` INT PRIMARY KEY,
  `imported_by` INT NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `total_rows` INT NOT NULL,
  `matched_rows` INT NOT NULL,
  `unmatched_rows` INT NOT NULL,
  `status` VARCHAR(100) NOT NULL,
  `imported_at` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. DMS CSV Rows Details
CREATE TABLE `dms_import_rows` (
  `row_id` INT PRIMARY KEY,
  `batch_id` INT NOT NULL,
  `row_number` INT NOT NULL,
  `vrn` VARCHAR(50) NOT NULL,
  `job_date` VARCHAR(50) NOT NULL,
  `sr_type` VARCHAR(100) NOT NULL,
  `labour_amount` INT NOT NULL,
  `parts_amount` INT NOT NULL,
  `total_amount` INT NOT NULL,
  `matched_job_id` INT NULL,
  `match_status` VARCHAR(100) NOT NULL,
  `conflict_reason` TEXT NULL,
  `resolved_by` INT NULL,
  `resolved_at` VARCHAR(50) NULL,
  `raw_data` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Job Revenue Allocation Split Values
CREATE TABLE `job_revenue_split` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `allocated_amount` DECIMAL(10, 2) NOT NULL,
  `percentage` DECIMAL(5, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Daily Technicians KPIs Analytics
CREATE TABLE `technician_kpi_daily` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `kpi_date` VARCHAR(50) NOT NULL,
  `jobs_assigned` INT NOT NULL,
  `jobs_completed` INT NOT NULL,
  `jobs_open` INT NOT NULL,
  `revenue_earned` DECIMAL(10, 2) NOT NULL,
  `avg_job_duration` INT NOT NULL,
  `completion_efficiency` DECIMAL(5, 2) NOT NULL,
  `utilization_percent` DECIMAL(5, 2) NOT NULL,
  `rework_count` INT NOT NULL,
  `rework_percent` DECIMAL(5, 2) NOT NULL,
  `tml_claims` INT NOT NULL,
  `tml_claim_rate` DECIMAL(5, 2) NOT NULL,
  `avg_revenue_per_job` DECIMAL(10, 2) NOT NULL,
  `on_time_completion` DECIMAL(5, 2) NOT NULL,
  `quality_score` DECIMAL(5, 2) NOT NULL,
  `idle_time` INT NOT NULL,
  `break_time` INT NOT NULL,
  `overtime_hours` DECIMAL(5, 2) NOT NULL,
  `health_status` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Productivity Threshold Violations Log
CREATE TABLE `productivity_alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `alert_type` VARCHAR(100) NOT NULL,
  `severity` VARCHAR(50) NOT NULL,
  `trigger_value` DECIMAL(10, 2) NOT NULL,
  `threshold_value` DECIMAL(10, 2) NOT NULL,
  `alert_message` TEXT NOT NULL,
  `recommended_action` TEXT NOT NULL,
  `status` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Rework Repair Incidents Timeline
CREATE TABLE `rework_tracking` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `original_job_id` INT NOT NULL,
  `rework_job_id` INT NOT NULL,
  `vehicle_reg` VARCHAR(50) NOT NULL,
  `assigned_technician_id` INT NOT NULL,
  `original_closure_date` TIMESTAMP NOT NULL,
  `rework_date` TIMESTAMP NOT NULL,
  `days_since_original` INT NOT NULL,
  `original_issue` TEXT NOT NULL,
  `rework_reason` TEXT NOT NULL,
  `rework_completed` TINYINT(1) NOT NULL,
  `rework_revenue` DECIMAL(10, 2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Workshops Physical Terminals Master
CREATE TABLE `workshops` (
  `workshop_id` INT PRIMARY KEY,
  `workshop_name` VARCHAR(255) NOT NULL,
  `latitude` DECIMAL(9, 6) NOT NULL,
  `longitude` DECIMAL(9, 6) NOT NULL,
  `allowed_gps_radius` INT NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Standard Workforce Shifts
CREATE TABLE `shifts` (
  `shift_id` INT PRIMARY KEY,
  `shift_type` VARCHAR(100) NOT NULL,
  `start_time` VARCHAR(50) NOT NULL,
  `end_time` VARCHAR(50) NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Dynamic Overtime Approvals Route Rules
CREATE TABLE `approval_matrices` (
  `matrix_id` INT PRIMARY KEY,
  `module_name` VARCHAR(100) NOT NULL,
  `ot_category` VARCHAR(100) NOT NULL,
  `workshop_id` INT NOT NULL,
  `role_name` VARCHAR(100) NOT NULL,
  `approval_level` INT NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. Overtime Claims Log
CREATE TABLE `overtime_requests` (
  `ot_id` INT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `ot_category` VARCHAR(100) NOT NULL,
  `date` VARCHAR(50) NOT NULL,
  `shift_id` INT NOT NULL,
  `ot_start_time` VARCHAR(50) NOT NULL,
  `ot_end_time` VARCHAR(50) NOT NULL,
  `total_hours` DECIMAL(5, 2) NOT NULL,
  `benefit_type` VARCHAR(100) NOT NULL,
  `ot_reason_category` VARCHAR(100) NOT NULL,
  `job_card_id` INT NULL,
  `workshop_id` INT NULL,
  `department` VARCHAR(255) NULL,
  `work_description` TEXT NULL,
  `comp_attendance_credit_earned` DECIMAL(3, 2) NULL,
  `snapshot_basic_salary` DECIMAL(12, 2) NULL,
  `snapshot_days_in_month` INT NULL,
  `hourly_salary_rate` DECIMAL(10, 2) NULL,
  `calculated_amount` DECIMAL(12, 2) NULL,
  `max_allowed_cap` DECIMAL(12, 2) NULL,
  `final_payable_amount` DECIMAL(12, 2) NULL,
  `capping_reason` TEXT NULL,
  `device_name` VARCHAR(255) NOT NULL,
  `operating_system` VARCHAR(100) NOT NULL,
  `app_version` VARCHAR(50) NOT NULL,
  `ip_address` VARCHAR(50) NOT NULL,
  `device_time` TIMESTAMP NOT NULL,
  `server_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `time_difference_seconds` INT NOT NULL,
  `face_verification_provider` VARCHAR(100) NULL,
  `face_match_result` VARCHAR(100) NULL,
  `face_match_score` DECIMAL(4, 3) NULL,
  `face_verification_time` TIMESTAMP NULL,
  `ocr_provider` VARCHAR(100) NULL,
  `ocr_confidence` DECIMAL(4, 3) NULL,
  `ocr_verification_time` TIMESTAMP NULL,
  `gps_lat` DECIMAL(9, 6) NOT NULL,
  `gps_lng` DECIMAL(9, 6) NOT NULL,
  `gps_matched` TINYINT(1) NOT NULL,
  `ai_recommendation_status` VARCHAR(100) NULL,
  `ai_flags` TEXT NULL,
  `current_level` INT NOT NULL,
  `current_status` VARCHAR(100) NOT NULL,
  `payroll_period` VARCHAR(50) NULL,
  `paid_at` TIMESTAMP NULL,
  `payment_reference` VARCHAR(255) NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. Overtime Document Attachments
CREATE TABLE `overtime_attachments` (
  `attachment_id` INT PRIMARY KEY,
  `ot_id` INT NOT NULL,
  `attachment_type` VARCHAR(100) NOT NULL,
  `file_path` TEXT NOT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29. Overtime Multi-Level Approver Log History
CREATE TABLE `overtime_workflow_history` (
  `history_id` INT PRIMARY KEY,
  `ot_id` INT NOT NULL,
  `level` INT NOT NULL,
  `approver_id` INT NOT NULL,
  `approver_role` VARCHAR(100) NOT NULL,
  `action_date` VARCHAR(50) NOT NULL,
  `action_time` VARCHAR(50) NOT NULL,
  `decision` VARCHAR(100) NOT NULL,
  `remarks` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 30. Overtime API Request Security Audits
CREATE TABLE `overtime_api_logs` (
  `log_id` INT PRIMARY KEY,
  `request_id` VARCHAR(100) NOT NULL,
  `user_id` INT NULL,
  `api_endpoint` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(50) NOT NULL,
  `device_info` TEXT NOT NULL,
  `execution_duration_ms` INT NOT NULL,
  `response_status` INT NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 31. Overtime Changes Audit Log
CREATE TABLE `overtime_audit_logs` (
  `log_id` INT PRIMARY KEY,
  `ot_id` INT NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `actor_id` INT NOT NULL,
  `actor_role` VARCHAR(100) NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(50) NOT NULL,
  `payload_diff` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
