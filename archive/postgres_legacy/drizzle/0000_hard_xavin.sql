CREATE SCHEMA "canonical";
--> statement-breakpoint
CREATE SCHEMA "legacy";
--> statement-breakpoint
CREATE SCHEMA "staging";
--> statement-breakpoint
CREATE TABLE "alert_configs" (
	"alert_config_id" integer PRIMARY KEY NOT NULL,
	"alert_code" text NOT NULL,
	"alert_name" text NOT NULL,
	"alert_category" text NOT NULL,
	"trigger_condition" text NOT NULL,
	"threshold_value" integer NOT NULL,
	"threshold_unit" text NOT NULL,
	"severity" text NOT NULL,
	"is_active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_logs" (
	"alert_id" integer PRIMARY KEY NOT NULL,
	"alert_config_id" integer NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"alert_message" text NOT NULL,
	"severity" text NOT NULL,
	"status" text NOT NULL,
	"acknowledged_by" integer,
	"acknowledged_at" text,
	"resolved_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_matrices" (
	"matrix_id" integer PRIMARY KEY NOT NULL,
	"module_name" text NOT NULL,
	"ot_category" text NOT NULL,
	"workshop_id" integer NOT NULL,
	"role_name" text NOT NULL,
	"approval_level" integer NOT NULL,
	"is_active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bays" (
	"bay_id" integer PRIMARY KEY NOT NULL,
	"bay_code" text NOT NULL,
	"bay_name" text NOT NULL,
	"bay_type" text NOT NULL,
	"status" text NOT NULL,
	"is_active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carry_forward_logs" (
	"cf_id" integer PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"cf_reason" text NOT NULL,
	"raised_by" integer NOT NULL,
	"approved_by" integer,
	"cf_status" text NOT NULL,
	"raised_at" text NOT NULL,
	"actioned_at" text
);
--> statement-breakpoint
CREATE TABLE "dim_certifications" (
	"cert_id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"certification_name" text NOT NULL,
	"issuing_authority" text,
	"certified_on" timestamp,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "dms_import_batches" (
	"batch_id" integer PRIMARY KEY NOT NULL,
	"imported_by" integer NOT NULL,
	"file_name" text NOT NULL,
	"total_rows" integer NOT NULL,
	"matched_rows" integer NOT NULL,
	"unmatched_rows" integer NOT NULL,
	"status" text NOT NULL,
	"imported_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dms_import_rows" (
	"row_id" integer PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"row_number" integer NOT NULL,
	"vrn" text NOT NULL,
	"job_date" text NOT NULL,
	"sr_type" text NOT NULL,
	"labour_amount" integer NOT NULL,
	"parts_amount" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"matched_job_id" integer,
	"match_status" text NOT NULL,
	"conflict_reason" text,
	"resolved_by" integer,
	"resolved_at" text,
	"raw_data" text
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"employee_id" integer PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"employee_code" text NOT NULL,
	"role" text NOT NULL,
	"employee_grade" text NOT NULL,
	"basic_salary" integer NOT NULL,
	"mobile" text NOT NULL,
	"is_active" boolean NOT NULL,
	"created_at" text,
	"allocated_revenue" integer,
	"target_revenue" integer,
	"paid_pct" text,
	"tml_claim_pct" text,
	"department" text,
	"workshop_id" integer,
	"shift_id" integer,
	"joining_date" text,
	"profile_photo_url" text,
	"face_embedding_reference" text,
	"email" text,
	"record_status" text
);
--> statement-breakpoint
CREATE TABLE "fsb_master" (
	"fsb_id" integer PRIMARY KEY NOT NULL,
	"job_card_id" integer,
	"fsb_status" text
);
--> statement-breakpoint
CREATE TABLE "gate_entries" (
	"gate_id" integer PRIMARY KEY NOT NULL,
	"token_number" text NOT NULL,
	"vrn" text NOT NULL,
	"vehicle_model" text NOT NULL,
	"chassis_number" text NOT NULL,
	"km_reading" integer NOT NULL,
	"driver_name" text NOT NULL,
	"driver_mobile" text NOT NULL,
	"driver_image" text,
	"waiting_time_mins" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_cards" (
	"job_id" integer PRIMARY KEY NOT NULL,
	"job_card_no" text NOT NULL,
	"vrn" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_mobile" text NOT NULL,
	"vehicle_make" text NOT NULL,
	"vehicle_model" text NOT NULL,
	"vehicle_year" integer NOT NULL,
	"km_reading" integer NOT NULL,
	"sr_type_id" integer NOT NULL,
	"job_description" text NOT NULL,
	"priority" text NOT NULL,
	"bay_id" integer,
	"status" text NOT NULL,
	"etd" text NOT NULL,
	"started_at" text,
	"completed_at" text,
	"invoiced_at" text,
	"created_by" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text,
	"workshop_stage" text,
	"l1_delay" text,
	"l2_delay" text,
	"l3_delay" text,
	"l5_delay" text,
	"delay_notes" text,
	"time_slot" text,
	"tat_status" text,
	"pending_reason" text,
	"remarks" text,
	"date_in" text,
	"time_in" text,
	"expected_date_out" text,
	"expected_time_of_completion" text,
	"time_out" text,
	"date_completed" text,
	"bay_no" text,
	"service_advisor" text,
	"technician_name" text,
	"no_of_laborers" integer,
	"actual_time_taken" text,
	"numberplate_photo" text,
	"odometer_photo" text,
	"chassis_number" text,
	"driver_name" text,
	"driver_mobile" text,
	"driver_image" text,
	"token_number" text,
	"waiting_time_mins" integer,
	"progress_pct" integer,
	"parts_price" integer,
	"labor_price" integer,
	"parts_status" text,
	"parts_list" text,
	"parts_images" text,
	"warranty_status" text,
	"payment_method" text,
	"payment_reference" text,
	"gate_pass_issued" boolean,
	"exited_at" text,
	"invoice_no" text,
	"gate_out_time" text,
	"emergency_flag" boolean DEFAULT false,
	"rework_count" integer DEFAULT 0,
	"current_workflow_state" text DEFAULT 'GATE_IN',
	"current_queue" text,
	"sla_status" text DEFAULT 'WITHIN_SLA',
	"current_etd" timestamp
);
--> statement-breakpoint
CREATE TABLE "job_revenue_split" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"allocated_amount" numeric(10, 2) NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_revenue_split_details" (
	"detail_id" integer PRIMARY KEY NOT NULL,
	"revenue_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"tech_role" text NOT NULL,
	"split_pct" integer NOT NULL,
	"split_amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_revenues" (
	"revenue_id" integer PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"labour_amount" integer NOT NULL,
	"parts_amount" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"split_id" integer NOT NULL,
	"calculated_at" text
);
--> statement-breakpoint
CREATE TABLE "job_technician_maps" (
	"map_id" integer PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"tech_role" text NOT NULL,
	"assigned_at" text
);
--> statement-breakpoint
CREATE TABLE "overtime_api_logs" (
	"log_id" integer PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" integer,
	"api_endpoint" text NOT NULL,
	"ip_address" text NOT NULL,
	"device_info" text NOT NULL,
	"execution_duration_ms" integer NOT NULL,
	"response_status" integer NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "overtime_attachments" (
	"attachment_id" integer PRIMARY KEY NOT NULL,
	"ot_id" integer NOT NULL,
	"attachment_type" text NOT NULL,
	"file_path" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "overtime_audit_logs" (
	"log_id" integer PRIMARY KEY NOT NULL,
	"ot_id" integer NOT NULL,
	"action" text NOT NULL,
	"actor_id" integer NOT NULL,
	"actor_role" text NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"ip_address" text NOT NULL,
	"payload_diff" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "overtime_requests" (
	"ot_id" integer PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"ot_category" text NOT NULL,
	"date" text NOT NULL,
	"shift_id" integer NOT NULL,
	"ot_start_time" text NOT NULL,
	"ot_end_time" text NOT NULL,
	"total_hours" numeric(5, 2) NOT NULL,
	"benefit_type" text NOT NULL,
	"ot_reason_category" text NOT NULL,
	"job_card_id" integer,
	"workshop_id" integer,
	"department" text,
	"work_description" text,
	"comp_attendance_credit_earned" numeric(3, 2),
	"snapshot_basic_salary" numeric(12, 2),
	"snapshot_days_in_month" integer,
	"hourly_salary_rate" numeric(10, 2),
	"calculated_amount" numeric(12, 2),
	"max_allowed_cap" numeric(12, 2),
	"final_payable_amount" numeric(12, 2),
	"capping_reason" text,
	"device_name" text NOT NULL,
	"operating_system" text NOT NULL,
	"app_version" text NOT NULL,
	"ip_address" text NOT NULL,
	"device_time" timestamp NOT NULL,
	"server_time" timestamp DEFAULT now(),
	"time_difference_seconds" integer NOT NULL,
	"face_verification_provider" text,
	"face_match_result" text,
	"face_match_score" numeric(4, 3),
	"face_verification_time" timestamp,
	"ocr_provider" text,
	"ocr_confidence" numeric(4, 3),
	"ocr_verification_time" timestamp,
	"gps_lat" numeric(9, 6) NOT NULL,
	"gps_lng" numeric(9, 6) NOT NULL,
	"gps_matched" boolean NOT NULL,
	"ai_recommendation_status" text,
	"ai_flags" text,
	"current_level" integer NOT NULL,
	"current_status" text NOT NULL,
	"payroll_period" text,
	"paid_at" timestamp,
	"payment_reference" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "overtime_workflow_history" (
	"history_id" integer PRIMARY KEY NOT NULL,
	"ot_id" integer NOT NULL,
	"level" integer NOT NULL,
	"approver_id" integer NOT NULL,
	"approver_role" text NOT NULL,
	"action_date" text NOT NULL,
	"action_time" text NOT NULL,
	"decision" text NOT NULL,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "productivity_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"trigger_value" numeric(10, 2) NOT NULL,
	"threshold_value" numeric(10, 2) NOT NULL,
	"alert_message" text NOT NULL,
	"recommended_action" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "revenue_splits" (
	"split_id" integer PRIMARY KEY NOT NULL,
	"combination_code" text NOT NULL,
	"combination_label" text NOT NULL,
	"person_count" integer NOT NULL,
	"tech_pct" integer NOT NULL,
	"co_tech_pct" integer NOT NULL,
	"electrician_pct" integer NOT NULL,
	"add_tech_pct" integer NOT NULL,
	"uses_salary_wt" boolean NOT NULL,
	"senior_override" boolean NOT NULL,
	"notes" text,
	"is_active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rework_logs" (
	"rework_id" integer PRIMARY KEY NOT NULL,
	"original_job_id" integer NOT NULL,
	"new_job_id" integer,
	"rework_reason" text NOT NULL,
	"original_tech_id" integer NOT NULL,
	"raised_by" integer NOT NULL,
	"approved_by" integer,
	"rework_status" text NOT NULL,
	"raised_at" text NOT NULL,
	"actioned_at" text
);
--> statement-breakpoint
CREATE TABLE "rework_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_job_id" integer NOT NULL,
	"rework_job_id" integer NOT NULL,
	"vehicle_reg" text NOT NULL,
	"assigned_technician_id" integer NOT NULL,
	"original_closure_date" timestamp NOT NULL,
	"rework_date" timestamp NOT NULL,
	"days_since_original" integer NOT NULL,
	"original_issue" text NOT NULL,
	"rework_reason" text NOT NULL,
	"rework_completed" boolean NOT NULL,
	"rework_revenue" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"permission_id" integer PRIMARY KEY NOT NULL,
	"role_name" text,
	"module_name" text,
	"can_view" boolean,
	"can_edit" boolean,
	"can_comment" boolean,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rpt_digital_approvals" (
	"approval_id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"signature_url" text,
	"approval_method" text NOT NULL,
	"otp_hash" text,
	"estimate_version" integer DEFAULT 1,
	"approved_amount" numeric(12, 2),
	"captured_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rpt_qc_checklists" (
	"qc_checklist_id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"inspector_id" integer NOT NULL,
	"result" text NOT NULL,
	"check_items_json" text,
	"road_test_km" integer,
	"inspector_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"shift_id" integer PRIMARY KEY NOT NULL,
	"shift_type" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sr_types" (
	"sr_type_id" integer PRIMARY KEY NOT NULL,
	"sr_type_code" text NOT NULL,
	"sr_type_name" text NOT NULL,
	"default_duration_mins" integer NOT NULL,
	"is_active" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tbl_audit_trail" (
	"audit_id" serial PRIMARY KEY NOT NULL,
	"validation_run_id" text,
	"session_id" text,
	"user_id" integer,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"action_code" text NOT NULL,
	"payload_diff" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tbl_decision_log" (
	"decision_id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"decision_type" text NOT NULL,
	"entity_type" text DEFAULT 'job_card' NOT NULL,
	"entity_id" integer NOT NULL,
	"ai_recommended_value" text,
	"actual_selected_value" text NOT NULL,
	"override_flag" boolean DEFAULT false,
	"reason_code" text NOT NULL,
	"justification" text NOT NULL,
	"actor_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"outcome" text,
	"confidence_score" numeric(4, 3)
);
--> statement-breakpoint
CREATE TABLE "tbl_notifications" (
	"notification_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notification_type" text,
	"message" text NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"is_read" boolean DEFAULT false,
	"related_job_id" integer,
	"action_url" text,
	"created_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tbl_validation_run" (
	"run_id" serial PRIMARY KEY NOT NULL,
	"validation_run_id" text NOT NULL,
	"dwip_version" text,
	"etl_version" text,
	"schema_version" text,
	"config_version" text,
	"git_commit_hash" text,
	"result" text NOT NULL,
	"total_checks" integer DEFAULT 0,
	"passed_checks" integer DEFAULT 0,
	"failed_checks" integer DEFAULT 0,
	"summary_json" text,
	"executed_by" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tbl_workflow_history" (
	"history_id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"old_state" text,
	"new_state" text NOT NULL,
	"queue" text,
	"sla_status" text,
	"etd" timestamp,
	"transition_by" integer,
	"transition_time" timestamp DEFAULT now(),
	"duration" integer,
	"reason" text,
	"event_id" text,
	"correlation_id" text,
	"parent_event_id" text,
	"sequence_number" integer,
	"source_system" text,
	"event_version" text,
	"event_status" text,
	"event_category" text,
	"source" text,
	"event_type" text,
	"user" text,
	"role" text,
	"workshop_id" integer,
	"payload" text
);
--> statement-breakpoint
CREATE TABLE "technician_kpi_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"kpi_date" text NOT NULL,
	"jobs_assigned" integer NOT NULL,
	"jobs_completed" integer NOT NULL,
	"jobs_open" integer NOT NULL,
	"revenue_earned" numeric(10, 2) NOT NULL,
	"avg_job_duration" integer NOT NULL,
	"completion_efficiency" numeric(5, 2) NOT NULL,
	"utilization_percent" numeric(5, 2) NOT NULL,
	"rework_count" integer NOT NULL,
	"rework_percent" numeric(5, 2) NOT NULL,
	"tml_claims" integer NOT NULL,
	"tml_claim_rate" numeric(5, 2) NOT NULL,
	"avg_revenue_per_job" numeric(10, 2) NOT NULL,
	"on_time_completion" numeric(5, 2) NOT NULL,
	"quality_score" numeric(5, 2) NOT NULL,
	"idle_time" integer NOT NULL,
	"break_time" integer NOT NULL,
	"overtime_hours" numeric(5, 2) NOT NULL,
	"health_status" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_access_master" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"username" text,
	"email" text,
	"user_role" text,
	"access_level" integer,
	"is_active" boolean,
	"created_at" timestamp,
	"mobile_no" text NOT NULL,
	"password_hash" text,
	"otp_hash" text,
	"otp_expiry" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"full_name" text,
	"username" text,
	"password_hash" text,
	"role" text,
	"employee_id" integer,
	"is_active" boolean,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"last_login" timestamp,
	"password_plain" text,
	"date_of_joining" text,
	"dob" text,
	"qualification" text,
	"designation" text,
	"grade" text,
	"floor_team" text,
	"clerical_team" text,
	"emp_id" text,
	"aadhaar_no" text,
	"mobile_no" text
);
--> statement-breakpoint
CREATE TABLE "workshops" (
	"workshop_id" integer PRIMARY KEY NOT NULL,
	"workshop_name" text NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"allowed_gps_radius" integer NOT NULL,
	"is_active" boolean NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_certs_employee" ON "dim_certifications" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_approvals_job" ON "rpt_digital_approvals" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_approvals_method" ON "rpt_digital_approvals" USING btree ("job_id","approval_method");--> statement-breakpoint
CREATE INDEX "idx_qc_job" ON "rpt_qc_checklists" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_qc_results" ON "rpt_qc_checklists" USING btree ("result","job_id");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "tbl_audit_trail" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_timestamp" ON "tbl_audit_trail" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_decision_job" ON "tbl_decision_log" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_decision_type" ON "tbl_decision_log" USING btree ("decision_type");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "tbl_notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_validation_run_id" ON "tbl_validation_run" USING btree ("validation_run_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_history_job" ON "tbl_workflow_history" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_history_states" ON "tbl_workflow_history" USING btree ("new_state","old_state");