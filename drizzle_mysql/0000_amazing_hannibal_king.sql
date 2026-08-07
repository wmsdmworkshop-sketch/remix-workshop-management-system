CREATE TABLE `alert_configs` (
	`alert_config_id` int NOT NULL,
	`alert_code` text NOT NULL,
	`alert_name` text NOT NULL,
	`alert_category` text NOT NULL,
	`trigger_condition` text NOT NULL,
	`threshold_value` int NOT NULL,
	`threshold_unit` text NOT NULL,
	`severity` text NOT NULL,
	`is_active` boolean NOT NULL,
	CONSTRAINT `alert_configs_alert_config_id` PRIMARY KEY(`alert_config_id`)
);
--> statement-breakpoint
CREATE TABLE `alert_logs` (
	`alert_id` int NOT NULL,
	`alert_config_id` int NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` int NOT NULL,
	`alert_message` text NOT NULL,
	`severity` text NOT NULL,
	`status` text NOT NULL,
	`acknowledged_by` int,
	`acknowledged_at` text,
	`resolved_at` text,
	`created_at` text NOT NULL,
	CONSTRAINT `alert_logs_alert_id` PRIMARY KEY(`alert_id`)
);
--> statement-breakpoint
CREATE TABLE `approval_matrices` (
	`matrix_id` int NOT NULL,
	`module_name` text NOT NULL,
	`ot_category` text NOT NULL,
	`workshop_id` int NOT NULL,
	`role_name` text NOT NULL,
	`approval_level` int NOT NULL,
	`is_active` boolean NOT NULL,
	CONSTRAINT `approval_matrices_matrix_id` PRIMARY KEY(`matrix_id`)
);
--> statement-breakpoint
CREATE TABLE `bays` (
	`bay_id` int NOT NULL,
	`bay_code` text NOT NULL,
	`bay_name` text NOT NULL,
	`bay_type` text NOT NULL,
	`status` text NOT NULL,
	`is_active` boolean NOT NULL,
	CONSTRAINT `bays_bay_id` PRIMARY KEY(`bay_id`)
);
--> statement-breakpoint
CREATE TABLE `carry_forward_logs` (
	`cf_id` int NOT NULL,
	`job_id` int NOT NULL,
	`cf_reason` text NOT NULL,
	`raised_by` int NOT NULL,
	`approved_by` int,
	`cf_status` text NOT NULL,
	`raised_at` text NOT NULL,
	`actioned_at` text,
	CONSTRAINT `carry_forward_logs_cf_id` PRIMARY KEY(`cf_id`)
);
--> statement-breakpoint
CREATE TABLE `dim_certifications` (
	`cert_id` serial AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`certification_name` text NOT NULL,
	`issuing_authority` text,
	`certified_on` timestamp,
	`valid_until` timestamp,
	`is_active` boolean DEFAULT true,
	CONSTRAINT `dim_certifications_cert_id` PRIMARY KEY(`cert_id`)
);
--> statement-breakpoint
CREATE TABLE `dms_import_batches` (
	`batch_id` int NOT NULL,
	`imported_by` int NOT NULL,
	`file_name` text NOT NULL,
	`total_rows` int NOT NULL,
	`matched_rows` int NOT NULL,
	`unmatched_rows` int NOT NULL,
	`status` text NOT NULL,
	`imported_at` text NOT NULL,
	CONSTRAINT `dms_import_batches_batch_id` PRIMARY KEY(`batch_id`)
);
--> statement-breakpoint
CREATE TABLE `dms_import_rows` (
	`row_id` int NOT NULL,
	`batch_id` int NOT NULL,
	`row_number` int NOT NULL,
	`vrn` text NOT NULL,
	`job_date` text NOT NULL,
	`sr_type` text NOT NULL,
	`labour_amount` int NOT NULL,
	`parts_amount` int NOT NULL,
	`total_amount` int NOT NULL,
	`matched_job_id` int,
	`match_status` text NOT NULL,
	`conflict_reason` text,
	`resolved_by` int,
	`resolved_at` text,
	`raw_data` text,
	CONSTRAINT `dms_import_rows_row_id` PRIMARY KEY(`row_id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`employee_id` int NOT NULL,
	`full_name` text NOT NULL,
	`employee_code` text NOT NULL,
	`role` text NOT NULL,
	`employee_grade` text NOT NULL,
	`basic_salary` int NOT NULL,
	`mobile` text NOT NULL,
	`is_active` boolean NOT NULL,
	`created_at` text,
	`allocated_revenue` int,
	`target_revenue` int,
	`paid_pct` text,
	`tml_claim_pct` text,
	`department` text,
	`workshop_id` int,
	`shift_id` int,
	`joining_date` text,
	`profile_photo_url` text,
	`face_embedding_reference` text,
	CONSTRAINT `employees_employee_id` PRIMARY KEY(`employee_id`)
);
--> statement-breakpoint
CREATE TABLE `fsb_master` (
	`fsb_id` int AUTO_INCREMENT NOT NULL,
	`job_card_id` int,
	`fsb_status` text,
	CONSTRAINT `fsb_master_fsb_id` PRIMARY KEY(`fsb_id`)
);
--> statement-breakpoint
CREATE TABLE `gate_entries` (
	`gate_id` int NOT NULL,
	`token_number` text NOT NULL,
	`vrn` text NOT NULL,
	`vehicle_model` text NOT NULL,
	`chassis_number` text NOT NULL,
	`km_reading` int NOT NULL,
	`driver_name` text NOT NULL,
	`driver_mobile` text NOT NULL,
	`driver_image` text,
	`waiting_time_mins` int NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `gate_entries_gate_id` PRIMARY KEY(`gate_id`)
);
--> statement-breakpoint
CREATE TABLE `job_cards` (
	`job_id` int NOT NULL,
	`job_card_no` text NOT NULL,
	`vrn` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_mobile` text NOT NULL,
	`vehicle_make` text NOT NULL,
	`vehicle_model` text NOT NULL,
	`vehicle_year` int NOT NULL,
	`km_reading` int NOT NULL,
	`sr_type_id` int NOT NULL,
	`job_description` text NOT NULL,
	`priority` text NOT NULL,
	`bay_id` int,
	`status` text NOT NULL,
	`etd` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`invoiced_at` text,
	`created_by` int NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text,
	`workshop_stage` text,
	`l1_delay` text,
	`l2_delay` text,
	`l3_delay` text,
	`l5_delay` text,
	`delay_notes` text,
	`time_slot` text,
	`tat_status` text,
	`pending_reason` text,
	`remarks` text,
	`date_in` text,
	`time_in` text,
	`expected_date_out` text,
	`expected_time_of_completion` text,
	`time_out` text,
	`date_completed` text,
	`bay_no` text,
	`service_advisor` text,
	`technician_name` text,
	`no_of_laborers` int,
	`actual_time_taken` text,
	`numberplate_photo` text,
	`odometer_photo` text,
	`chassis_number` text,
	`driver_name` text,
	`driver_mobile` text,
	`driver_image` text,
	`token_number` text,
	`waiting_time_mins` int,
	`progress_pct` int,
	`parts_price` int,
	`labor_price` int,
	`parts_status` text,
	`parts_list` text,
	`parts_images` text,
	`warranty_status` text,
	`payment_method` text,
	`payment_reference` text,
	`gate_pass_issued` boolean,
	`exited_at` text,
	`invoice_no` text,
	`gate_out_time` text,
	`emergency_flag` boolean DEFAULT false,
	`rework_count` int DEFAULT 0,
	`current_workflow_state` text DEFAULT ('GATE_IN'),
	`current_queue` text,
	`sla_status` text DEFAULT ('WITHIN_SLA'),
	`current_etd` timestamp,
	CONSTRAINT `job_cards_job_id` PRIMARY KEY(`job_id`)
);
--> statement-breakpoint
CREATE TABLE `job_revenue_split` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`allocated_amount` decimal(10,2) NOT NULL,
	`percentage` decimal(5,2) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `job_revenue_split_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_revenue_split_details` (
	`detail_id` int NOT NULL,
	`revenue_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`tech_role` text NOT NULL,
	`split_pct` int NOT NULL,
	`split_amount` int NOT NULL,
	CONSTRAINT `job_revenue_split_details_detail_id` PRIMARY KEY(`detail_id`)
);
--> statement-breakpoint
CREATE TABLE `job_revenues` (
	`revenue_id` int NOT NULL,
	`job_id` int NOT NULL,
	`labour_amount` int NOT NULL,
	`parts_amount` int NOT NULL,
	`total_amount` int NOT NULL,
	`split_id` int NOT NULL,
	`calculated_at` text,
	CONSTRAINT `job_revenues_revenue_id` PRIMARY KEY(`revenue_id`)
);
--> statement-breakpoint
CREATE TABLE `job_technician_maps` (
	`map_id` int NOT NULL,
	`job_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`tech_role` text NOT NULL,
	`assigned_at` text,
	CONSTRAINT `job_technician_maps_map_id` PRIMARY KEY(`map_id`)
);
--> statement-breakpoint
CREATE TABLE `overtime_api_logs` (
	`log_id` int NOT NULL,
	`request_id` text NOT NULL,
	`user_id` int,
	`api_endpoint` text NOT NULL,
	`ip_address` text NOT NULL,
	`device_info` text NOT NULL,
	`execution_duration_ms` int NOT NULL,
	`response_status` int NOT NULL,
	`timestamp` timestamp DEFAULT (now()),
	CONSTRAINT `overtime_api_logs_log_id` PRIMARY KEY(`log_id`)
);
--> statement-breakpoint
CREATE TABLE `overtime_attachments` (
	`attachment_id` int NOT NULL,
	`ot_id` int NOT NULL,
	`attachment_type` text NOT NULL,
	`file_path` text NOT NULL,
	`uploaded_at` timestamp DEFAULT (now()),
	CONSTRAINT `overtime_attachments_attachment_id` PRIMARY KEY(`attachment_id`)
);
--> statement-breakpoint
CREATE TABLE `overtime_audit_logs` (
	`log_id` int NOT NULL,
	`ot_id` int NOT NULL,
	`action` text NOT NULL,
	`actor_id` int NOT NULL,
	`actor_role` text NOT NULL,
	`timestamp` timestamp DEFAULT (now()),
	`ip_address` text NOT NULL,
	`payload_diff` text NOT NULL,
	CONSTRAINT `overtime_audit_logs_log_id` PRIMARY KEY(`log_id`)
);
--> statement-breakpoint
CREATE TABLE `overtime_requests` (
	`ot_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`ot_category` text NOT NULL,
	`date` text NOT NULL,
	`shift_id` int NOT NULL,
	`ot_start_time` text NOT NULL,
	`ot_end_time` text NOT NULL,
	`total_hours` decimal(5,2) NOT NULL,
	`benefit_type` text NOT NULL,
	`ot_reason_category` text NOT NULL,
	`job_card_id` int,
	`workshop_id` int,
	`department` text,
	`work_description` text,
	`comp_attendance_credit_earned` decimal(3,2),
	`snapshot_basic_salary` decimal(12,2),
	`snapshot_days_in_month` int,
	`hourly_salary_rate` decimal(10,2),
	`calculated_amount` decimal(12,2),
	`max_allowed_cap` decimal(12,2),
	`final_payable_amount` decimal(12,2),
	`capping_reason` text,
	`device_name` text NOT NULL,
	`operating_system` text NOT NULL,
	`app_version` text NOT NULL,
	`ip_address` text NOT NULL,
	`device_time` timestamp NOT NULL,
	`server_time` timestamp DEFAULT (now()),
	`time_difference_seconds` int NOT NULL,
	`face_verification_provider` text,
	`face_match_result` text,
	`face_match_score` decimal(4,3),
	`face_verification_time` timestamp,
	`ocr_provider` text,
	`ocr_confidence` decimal(4,3),
	`ocr_verification_time` timestamp,
	`gps_lat` decimal(9,6) NOT NULL,
	`gps_lng` decimal(9,6) NOT NULL,
	`gps_matched` boolean NOT NULL,
	`ai_recommendation_status` text,
	`ai_flags` text,
	`current_level` int NOT NULL,
	`current_status` text NOT NULL,
	`payroll_period` text,
	`paid_at` timestamp,
	`payment_reference` text,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `overtime_requests_ot_id` PRIMARY KEY(`ot_id`)
);
--> statement-breakpoint
CREATE TABLE `overtime_workflow_history` (
	`history_id` int NOT NULL,
	`ot_id` int NOT NULL,
	`level` int NOT NULL,
	`approver_id` int NOT NULL,
	`approver_role` text NOT NULL,
	`action_date` text NOT NULL,
	`action_time` text NOT NULL,
	`decision` text NOT NULL,
	`remarks` text,
	CONSTRAINT `overtime_workflow_history_history_id` PRIMARY KEY(`history_id`)
);
--> statement-breakpoint
CREATE TABLE `productivity_alerts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`alert_type` text NOT NULL,
	`severity` text NOT NULL,
	`trigger_value` decimal(10,2) NOT NULL,
	`threshold_value` decimal(10,2) NOT NULL,
	`alert_message` text NOT NULL,
	`recommended_action` text NOT NULL,
	`status` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`resolved_at` timestamp,
	CONSTRAINT `productivity_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenue_splits` (
	`split_id` int NOT NULL,
	`combination_code` text NOT NULL,
	`combination_label` text NOT NULL,
	`person_count` int NOT NULL,
	`tech_pct` int NOT NULL,
	`co_tech_pct` int NOT NULL,
	`electrician_pct` int NOT NULL,
	`add_tech_pct` int NOT NULL,
	`uses_salary_wt` boolean NOT NULL,
	`senior_override` boolean NOT NULL,
	`notes` text,
	`is_active` boolean NOT NULL,
	CONSTRAINT `revenue_splits_split_id` PRIMARY KEY(`split_id`)
);
--> statement-breakpoint
CREATE TABLE `rework_logs` (
	`rework_id` int NOT NULL,
	`original_job_id` int NOT NULL,
	`new_job_id` int,
	`rework_reason` text NOT NULL,
	`original_tech_id` int NOT NULL,
	`raised_by` int NOT NULL,
	`approved_by` int,
	`rework_status` text NOT NULL,
	`raised_at` text NOT NULL,
	`actioned_at` text,
	CONSTRAINT `rework_logs_rework_id` PRIMARY KEY(`rework_id`)
);
--> statement-breakpoint
CREATE TABLE `rework_tracking` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`original_job_id` int NOT NULL,
	`rework_job_id` int NOT NULL,
	`vehicle_reg` text NOT NULL,
	`assigned_technician_id` int NOT NULL,
	`original_closure_date` timestamp NOT NULL,
	`rework_date` timestamp NOT NULL,
	`days_since_original` int NOT NULL,
	`original_issue` text NOT NULL,
	`rework_reason` text NOT NULL,
	`rework_completed` boolean NOT NULL,
	`rework_revenue` decimal(10,2) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `rework_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`permission_id` int AUTO_INCREMENT NOT NULL,
	`role_name` text,
	`module_name` text,
	`can_view` boolean,
	`can_edit` boolean,
	`can_comment` boolean,
	`updated_by` int,
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `role_permissions_permission_id` PRIMARY KEY(`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `rpt_digital_approvals` (
	`approval_id` serial AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`signature_url` text,
	`approval_method` text NOT NULL,
	`otp_hash` text,
	`estimate_version` int DEFAULT 1,
	`approved_amount` decimal(12,2),
	`captured_by` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `rpt_digital_approvals_approval_id` PRIMARY KEY(`approval_id`)
);
--> statement-breakpoint
CREATE TABLE `rpt_qc_checklists` (
	`qc_checklist_id` serial AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`inspector_id` int NOT NULL,
	`result` text NOT NULL,
	`check_items_json` text,
	`road_test_km` int,
	`inspector_notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `rpt_qc_checklists_qc_checklist_id` PRIMARY KEY(`qc_checklist_id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`shift_id` int NOT NULL,
	`shift_type` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_active` boolean NOT NULL,
	CONSTRAINT `shifts_shift_id` PRIMARY KEY(`shift_id`)
);
--> statement-breakpoint
CREATE TABLE `sr_types` (
	`sr_type_id` int NOT NULL,
	`sr_type_code` text NOT NULL,
	`sr_type_name` text NOT NULL,
	`default_duration_mins` int NOT NULL,
	`is_active` boolean NOT NULL,
	CONSTRAINT `sr_types_sr_type_id` PRIMARY KEY(`sr_type_id`)
);
--> statement-breakpoint
CREATE TABLE `tbl_audit_trail` (
	`audit_id` serial AUTO_INCREMENT NOT NULL,
	`validation_run_id` text,
	`session_id` text,
	`user_id` int,
	`entity_type` text NOT NULL,
	`entity_id` int NOT NULL,
	`action_code` text NOT NULL,
	`payload_diff` text,
	`ip_address` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_audit_trail_audit_id` PRIMARY KEY(`audit_id`)
);
--> statement-breakpoint
CREATE TABLE `tbl_decision_log` (
	`decision_id` serial AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`decision_type` text NOT NULL,
	`entity_type` text NOT NULL DEFAULT ('job_card'),
	`entity_id` int NOT NULL,
	`ai_recommended_value` text,
	`actual_selected_value` text NOT NULL,
	`override_flag` boolean DEFAULT false,
	`reason_code` text NOT NULL,
	`justification` text NOT NULL,
	`actor_id` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`outcome` text,
	`confidence_score` decimal(4,3),
	CONSTRAINT `tbl_decision_log_decision_id` PRIMARY KEY(`decision_id`)
);
--> statement-breakpoint
CREATE TABLE `tbl_notifications` (
	`notification_id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`notification_type` text,
	`message` text NOT NULL,
	`priority` text NOT NULL DEFAULT ('MEDIUM'),
	`is_read` boolean DEFAULT false,
	`related_job_id` int,
	`action_url` text,
	`created_at` timestamp DEFAULT (now()),
	`read_at` timestamp,
	CONSTRAINT `tbl_notifications_notification_id` PRIMARY KEY(`notification_id`)
);
--> statement-breakpoint
CREATE TABLE `tbl_validation_run` (
	`run_id` serial AUTO_INCREMENT NOT NULL,
	`validation_run_id` text NOT NULL,
	`dwip_version` text,
	`etl_version` text,
	`schema_version` text,
	`config_version` text,
	`git_commit_hash` text,
	`result` text NOT NULL,
	`total_checks` int DEFAULT 0,
	`passed_checks` int DEFAULT 0,
	`failed_checks` int DEFAULT 0,
	`summary_json` text,
	`executed_by` int,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_validation_run_run_id` PRIMARY KEY(`run_id`),
	CONSTRAINT `idx_validation_run_id` UNIQUE(`validation_run_id`)
);
--> statement-breakpoint
CREATE TABLE `tbl_workflow_history` (
	`history_id` serial AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`old_state` text,
	`new_state` text NOT NULL,
	`queue` text,
	`sla_status` text,
	`etd` timestamp,
	`transition_by` int,
	`transition_time` timestamp DEFAULT (now()),
	`duration` int,
	`reason` text,
	CONSTRAINT `tbl_workflow_history_history_id` PRIMARY KEY(`history_id`)
);
--> statement-breakpoint
CREATE TABLE `technician_kpi_daily` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`kpi_date` text NOT NULL,
	`jobs_assigned` int NOT NULL,
	`jobs_completed` int NOT NULL,
	`jobs_open` int NOT NULL,
	`revenue_earned` decimal(10,2) NOT NULL,
	`avg_job_duration` int NOT NULL,
	`completion_efficiency` decimal(5,2) NOT NULL,
	`utilization_percent` decimal(5,2) NOT NULL,
	`rework_count` int NOT NULL,
	`rework_percent` decimal(5,2) NOT NULL,
	`tml_claims` int NOT NULL,
	`tml_claim_rate` decimal(5,2) NOT NULL,
	`avg_revenue_per_job` decimal(10,2) NOT NULL,
	`on_time_completion` decimal(5,2) NOT NULL,
	`quality_score` decimal(5,2) NOT NULL,
	`idle_time` int NOT NULL,
	`break_time` int NOT NULL,
	`overtime_hours` decimal(5,2) NOT NULL,
	`health_status` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `technician_kpi_daily_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_access_master` (
	`user_id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int,
	`username` text,
	`email` text,
	`user_role` text,
	`access_level` int,
	`is_active` boolean,
	`created_at` timestamp,
	`mobile_no` text NOT NULL,
	`password_hash` text,
	`otp_hash` text,
	`otp_expiry` timestamp,
	CONSTRAINT `user_access_master_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` int AUTO_INCREMENT NOT NULL,
	`full_name` text,
	`username` text,
	`password_hash` text,
	`role` text,
	`employee_id` int,
	`is_active` boolean,
	`created_by` int,
	`created_at` timestamp DEFAULT (now()),
	`last_login` timestamp,
	`password_plain` text,
	`date_of_joining` text,
	`dob` text,
	`qualification` text,
	`designation` text,
	`grade` text,
	`floor_team` text,
	`clerical_team` text,
	`emp_id` text,
	`aadhaar_no` text,
	`mobile_no` text,
	CONSTRAINT `users_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `workshops` (
	`workshop_id` int NOT NULL,
	`workshop_name` text NOT NULL,
	`latitude` decimal(9,6) NOT NULL,
	`longitude` decimal(9,6) NOT NULL,
	`allowed_gps_radius` int NOT NULL,
	`is_active` boolean NOT NULL,
	CONSTRAINT `workshops_workshop_id` PRIMARY KEY(`workshop_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_certs_employee` ON `dim_certifications` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_approvals_job` ON `rpt_digital_approvals` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_approvals_method` ON `rpt_digital_approvals` (`job_id`,`approval_method`);--> statement-breakpoint
CREATE INDEX `idx_qc_job` ON `rpt_qc_checklists` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_qc_results` ON `rpt_qc_checklists` (`result`,`job_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `tbl_audit_trail` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_timestamp` ON `tbl_audit_trail` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_decision_job` ON `tbl_decision_log` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_decision_type` ON `tbl_decision_log` (`decision_type`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user` ON `tbl_notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `idx_workflow_history_job` ON `tbl_workflow_history` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_workflow_history_states` ON `tbl_workflow_history` (`new_state`,`old_state`);