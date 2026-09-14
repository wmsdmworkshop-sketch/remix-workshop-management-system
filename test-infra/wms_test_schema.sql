-- MySQL dump (STRUCTURE ONLY, no data)
--
-- Source: Cloud SQL instance wms-mysql-db, schema `railway`
-- Generated: 2026-09-13T19:06:08.719Z
-- Objects: 178 tables, 5 views
--
-- PROVENANCE / HOW TO REGENERATE
--   This file must stay in step with production, or `npm run db:setup:test`
--   fails part-way through the migrations (it previously died at v17 because
--   the file was a pre-Cloud-SQL dump ~104 tables behind).
--
--   Regenerate with:  node test-infra/regenerate_test_schema.mjs
--   (equivalent CLI:  mysqldump --no-data --routines --triggers --skip-add-drop-table
--                     --host <cloud-sql-host> --user root <schema>)
--
-- CONTRACT: this file contains DDL ONLY — no INSERT/REPLACE/UPDATE/DELETE.
-- The isolated test schema must never carry real operational or customer data.
--

SET FOREIGN_KEY_CHECKS=0;
/*!50503 SET NAMES utf8mb4 */;

--
-- Table structure for `ai_brain_activity_log`
--
DROP TABLE IF EXISTS `ai_brain_activity_log`;
CREATE TABLE `ai_brain_activity_log` (
  `log_id` varchar(40) NOT NULL,
  `brain_id` varchar(20) NOT NULL,
  `triggered_by` varchar(100) DEFAULT NULL,
  `input_summary` text,
  `output_summary` text,
  `success` tinyint(1) NOT NULL DEFAULT '1',
  `duration_ms` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_brain_created` (`brain_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `ai_brain_decision_log`
--
DROP TABLE IF EXISTS `ai_brain_decision_log`;
CREATE TABLE `ai_brain_decision_log` (
  `decision_id` bigint NOT NULL AUTO_INCREMENT,
  `activity_log_id` varchar(40) NOT NULL,
  `decision` enum('ACCEPTED','REJECTED','MODIFIED') NOT NULL,
  `notes` text,
  `decided_by_user_id` int NOT NULL,
  `decided_by_employee_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`decision_id`),
  KEY `idx_activity_log` (`activity_log_id`),
  KEY `idx_decided_by_user` (`decided_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `ai_brain_memory`
--
DROP TABLE IF EXISTS `ai_brain_memory`;
CREATE TABLE `ai_brain_memory` (
  `memory_id` varchar(40) NOT NULL,
  `vehicle_model` varchar(100) DEFAULT NULL,
  `complaint_text` text,
  `diagnosis` text,
  `parts_used` text,
  `outcome` varchar(50) DEFAULT NULL,
  `technician_name` varchar(255) DEFAULT NULL,
  `job_card_ref` varchar(50) DEFAULT NULL,
  `source_table` varchar(30) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`memory_id`),
  KEY `idx_vehicle_model` (`vehicle_model`(50))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `ai_brain_registry`
--
DROP TABLE IF EXISTS `ai_brain_registry`;
CREATE TABLE `ai_brain_registry` (
  `brain_id` varchar(20) NOT NULL,
  `brain_name` varchar(50) NOT NULL,
  `tier` varchar(10) NOT NULL,
  `role_description` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'OBSERVING',
  `total_invocations` int NOT NULL DEFAULT '0',
  `total_errors` int NOT NULL DEFAULT '0',
  `last_active_at` datetime DEFAULT NULL,
  `last_error` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`brain_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `ai_copilot_skills`
--
DROP TABLE IF EXISTS `ai_copilot_skills`;
CREATE TABLE `ai_copilot_skills` (
  `skill_id` varchar(100) NOT NULL,
  `skill_name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `allowed_roles` text NOT NULL,
  `usage_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`skill_id`),
  UNIQUE KEY `skill_name` (`skill_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `ai_recommendations`
--
DROP TABLE IF EXISTS `ai_recommendations`;
CREATE TABLE `ai_recommendations` (
  `recommendation_id` varchar(100) NOT NULL,
  `recommendation_type` varchar(100) NOT NULL,
  `details_json` text NOT NULL,
  `confidence_score` decimal(5,2) NOT NULL,
  `requires_approval` tinyint(1) DEFAULT '1',
  `approval_status` varchar(50) DEFAULT 'PENDING',
  `approved_by` int DEFAULT NULL,
  `feedback_rating` int DEFAULT NULL,
  `feedback_comments` text,
  `role_submitting` varchar(100) DEFAULT NULL,
  `time_saved_sec` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`recommendation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `ai_vector_memory`
--
DROP TABLE IF EXISTS `ai_vector_memory`;
CREATE TABLE `ai_vector_memory` (
  `vector_id` varchar(128) NOT NULL,
  `vehicle_model` varchar(191) DEFAULT NULL,
  `complaint_text` text,
  `diagnosis` text,
  `outcome` varchar(191) DEFAULT NULL,
  `job_card_ref` varchar(64) DEFAULT NULL,
  `source_table` varchar(64) NOT NULL DEFAULT 'job_cards',
  `occurred_at` datetime DEFAULT NULL,
  `embedding` json DEFAULT NULL,
  `dimensions` smallint unsigned DEFAULT NULL,
  `indexed_remote` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`vector_id`),
  KEY `idx_vehicle_model` (`vehicle_model`),
  KEY `idx_indexed_remote` (`indexed_remote`),
  KEY `idx_occurred_at` (`occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `alert_config_master`
--
DROP TABLE IF EXISTS `alert_config_master`;
CREATE TABLE `alert_config_master` (
  `alert_id` int unsigned NOT NULL AUTO_INCREMENT,
  `alert_type` varchar(50) NOT NULL,
  `trigger_minutes` int unsigned NOT NULL DEFAULT '30',
  `level_1_role` varchar(50) DEFAULT NULL,
  `level_2_role` varchar(50) DEFAULT NULL,
  `level_3_role` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`alert_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `alert_configs`
--
DROP TABLE IF EXISTS `alert_configs`;
CREATE TABLE `alert_configs` (
  `alert_config_id` int NOT NULL,
  `alert_code` text NOT NULL,
  `alert_name` text NOT NULL,
  `alert_category` text NOT NULL,
  `trigger_condition` text NOT NULL,
  `threshold_value` int NOT NULL,
  `threshold_unit` text NOT NULL,
  `severity` text NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  PRIMARY KEY (`alert_config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `alert_log`
--
DROP TABLE IF EXISTS `alert_log`;
CREATE TABLE `alert_log` (
  `log_id` int unsigned NOT NULL AUTO_INCREMENT,
  `alert_id` int unsigned NOT NULL,
  `job_card_id` int unsigned NOT NULL,
  `triggered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `alert_level` enum('Level 1','Level 2','Level 3') NOT NULL,
  `notified_role` varchar(50) DEFAULT NULL,
  `is_resolved` tinyint(1) NOT NULL DEFAULT '0',
  `resolved_by` int unsigned DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `remarks` text,
  PRIMARY KEY (`log_id`),
  KEY `alert_id` (`alert_id`),
  KEY `job_card_id` (`job_card_id`),
  KEY `resolved_by` (`resolved_by`),
  CONSTRAINT `alert_log_ibfk_1` FOREIGN KEY (`alert_id`) REFERENCES `alert_config_master` (`alert_id`),
  CONSTRAINT `alert_log_ibfk_2` FOREIGN KEY (`job_card_id`) REFERENCES `job_card_master` (`job_card_id`),
  CONSTRAINT `alert_log_ibfk_3` FOREIGN KEY (`resolved_by`) REFERENCES `employee_master` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `alert_logs`
--
DROP TABLE IF EXISTS `alert_logs`;
CREATE TABLE `alert_logs` (
  `alert_id` int NOT NULL,
  `alert_config_id` int NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` int NOT NULL,
  `alert_message` text NOT NULL,
  `severity` text NOT NULL,
  `status` text NOT NULL,
  `acknowledged_by` int DEFAULT NULL,
  `acknowledged_at` text,
  `resolved_at` text,
  `created_at` text NOT NULL,
  PRIMARY KEY (`alert_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `approval_decisions`
--
DROP TABLE IF EXISTS `approval_decisions`;
CREATE TABLE `approval_decisions` (
  `decision_id` varchar(36) NOT NULL,
  `approval_request_id` varchar(36) NOT NULL,
  `actor_id` varchar(50) NOT NULL,
  `actor_role` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL,
  `comments` text,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`decision_id`),
  KEY `approval_request_id` (`approval_request_id`),
  CONSTRAINT `approval_decisions_ibfk_1` FOREIGN KEY (`approval_request_id`) REFERENCES `approval_requests` (`approval_request_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `approval_delegations`
--
DROP TABLE IF EXISTS `approval_delegations`;
CREATE TABLE `approval_delegations` (
  `delegation_id` varchar(36) NOT NULL,
  `approval_request_id` varchar(36) NOT NULL,
  `from_actor_id` varchar(50) NOT NULL,
  `to_actor_id` varchar(50) NOT NULL,
  `to_actor_role` varchar(50) NOT NULL,
  `reason` text,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`delegation_id`),
  KEY `approval_request_id` (`approval_request_id`),
  CONSTRAINT `approval_delegations_ibfk_1` FOREIGN KEY (`approval_request_id`) REFERENCES `approval_requests` (`approval_request_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `approval_matrices`
--
DROP TABLE IF EXISTS `approval_matrices`;
CREATE TABLE `approval_matrices` (
  `matrix_id` int NOT NULL AUTO_INCREMENT,
  `module_name` varchar(100) NOT NULL DEFAULT 'OVERTIME',
  `ot_category` varchar(50) NOT NULL,
  `workshop_id` int NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `approval_level` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`matrix_id`),
  KEY `workshop_id` (`workshop_id`),
  CONSTRAINT `approval_matrices_ibfk_1` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`workshop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `approval_requests`
--
DROP TABLE IF EXISTS `approval_requests`;
CREATE TABLE `approval_requests` (
  `approval_request_id` varchar(36) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(50) NOT NULL,
  `workflow_type` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL,
  `strategy` varchar(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`approval_request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `approval_steps`
--
DROP TABLE IF EXISTS `approval_steps`;
CREATE TABLE `approval_steps` (
  `step_id` varchar(50) NOT NULL,
  `approval_request_id` varchar(36) NOT NULL,
  `allowed_roles` text NOT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '1',
  `sla_minutes` int DEFAULT NULL,
  PRIMARY KEY (`step_id`,`approval_request_id`),
  KEY `approval_request_id` (`approval_request_id`),
  CONSTRAINT `approval_steps_ibfk_1` FOREIGN KEY (`approval_request_id`) REFERENCES `approval_requests` (`approval_request_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `authorization_audit_log`
--
DROP TABLE IF EXISTS `authorization_audit_log`;
CREATE TABLE `authorization_audit_log` (
  `audit_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(100) NOT NULL,
  `resource` varchar(255) NOT NULL,
  `decision` varchar(20) NOT NULL,
  `reason` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `backup_legacy_bays`
--
DROP TABLE IF EXISTS `backup_legacy_bays`;
CREATE TABLE `backup_legacy_bays` (
  `bay_id` int NOT NULL,
  `bay_code` text NOT NULL,
  `bay_name` text NOT NULL,
  `bay_type` text NOT NULL,
  `status` text NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  PRIMARY KEY (`bay_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `backup_legacy_employees`
--
DROP TABLE IF EXISTS `backup_legacy_employees`;
CREATE TABLE `backup_legacy_employees` (
  `employee_id` int NOT NULL,
  `full_name` text NOT NULL,
  `employee_code` text NOT NULL,
  `role` text NOT NULL,
  `employee_grade` text NOT NULL,
  `basic_salary` int NOT NULL,
  `mobile` text NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` text,
  `allocated_revenue` int DEFAULT NULL,
  `target_revenue` int DEFAULT NULL,
  `paid_pct` text,
  `tml_claim_pct` text,
  PRIMARY KEY (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `backup_legacy_job_cards`
--
DROP TABLE IF EXISTS `backup_legacy_job_cards`;
CREATE TABLE `backup_legacy_job_cards` (
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
  `bay_id` int DEFAULT NULL,
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
  `no_of_laborers` int DEFAULT NULL,
  `actual_time_taken` text,
  `numberplate_photo` text,
  `odometer_photo` text,
  `chassis_number` text,
  `driver_name` text,
  `driver_mobile` text,
  `driver_image` longtext,
  `token_number` text,
  `waiting_time_mins` int DEFAULT NULL,
  `progress_pct` int DEFAULT '0',
  `parts_price` int DEFAULT '0',
  `labor_price` int DEFAULT '0',
  `parts_status` varchar(255) DEFAULT 'None',
  `parts_list` text,
  `parts_images` longtext,
  `warranty_status` varchar(255) DEFAULT 'None',
  `payment_method` varchar(255) DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  `gate_pass_issued` tinyint(1) DEFAULT '0',
  `exited_at` text,
  PRIMARY KEY (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `bay_master`
--
DROP TABLE IF EXISTS `bay_master`;
CREATE TABLE `bay_master` (
  `bay_id` int unsigned NOT NULL AUTO_INCREMENT,
  `bay_code` varchar(10) NOT NULL,
  `bay_name` varchar(50) NOT NULL,
  `bay_type` varchar(50) DEFAULT NULL,
  `bay_status` enum('Available','In Progress','Waiting Parts','Ready Delivery','Carry Forward','Blocked') DEFAULT 'Available',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `grid_row` int unsigned DEFAULT '1',
  `grid_column` int unsigned DEFAULT '1',
  `entry_direction` enum('Front','Rear') DEFAULT 'Front',
  PRIMARY KEY (`bay_id`),
  UNIQUE KEY `bay_code` (`bay_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `bay_queue`
--
DROP TABLE IF EXISTS `bay_queue`;
CREATE TABLE `bay_queue` (
  `queue_id` int unsigned NOT NULL AUTO_INCREMENT,
  `bay_id` int unsigned NOT NULL,
  `job_card_id` int unsigned NOT NULL,
  `queue_position` int unsigned NOT NULL DEFAULT '1',
  `queue_status` varchar(50) DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`queue_id`),
  KEY `bay_id` (`bay_id`),
  KEY `job_card_id` (`job_card_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `bay_queue_ibfk_1` FOREIGN KEY (`bay_id`) REFERENCES `bay_master` (`bay_id`),
  CONSTRAINT `bay_queue_ibfk_2` FOREIGN KEY (`job_card_id`) REFERENCES `job_card_master` (`job_card_id`),
  CONSTRAINT `bay_queue_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `employee_master` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `bays`
--
DROP TABLE IF EXISTS `bays`;
CREATE TABLE `bays` (
  `bay_id` int NOT NULL,
  `bay_code` varchar(50) NOT NULL,
  `bay_name` varchar(100) NOT NULL,
  `bay_type` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Idle',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`bay_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `breakdown_attachments`
--
DROP TABLE IF EXISTS `breakdown_attachments`;
CREATE TABLE `breakdown_attachments` (
  `attachment_id` int NOT NULL AUTO_INCREMENT,
  `breakdown_id` int NOT NULL,
  `attachment_type` varchar(50) NOT NULL,
  `file_path` text NOT NULL,
  `driver_name` varchar(200) DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attachment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `breakdown_communications`
--
DROP TABLE IF EXISTS `breakdown_communications`;
CREATE TABLE `breakdown_communications` (
  `communication_id` int NOT NULL AUTO_INCREMENT,
  `breakdown_id` int NOT NULL,
  `communication_type` varchar(50) NOT NULL,
  `sender_id` int NOT NULL,
  `recipient_role` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `logged_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`communication_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `breakdowns`
--
DROP TABLE IF EXISTS `breakdowns`;
CREATE TABLE `breakdowns` (
  `breakdown_id` int NOT NULL AUTO_INCREMENT,
  `sr_number` varchar(100) DEFAULT NULL,
  `complaint_date` datetime DEFAULT NULL,
  `complaint_number` varchar(100) DEFAULT NULL,
  `vehicle_number` varchar(100) NOT NULL,
  `assigned_qrt` varchar(100) DEFAULT NULL,
  `assignment_time` datetime DEFAULT NULL,
  `attendance_time` datetime DEFAULT NULL,
  `complaint` text,
  `technician` varchar(200) DEFAULT NULL,
  `assistant_technician` varchar(200) DEFAULT NULL,
  `mechanical_helper` varchar(200) DEFAULT NULL,
  `electrician` varchar(200) DEFAULT NULL,
  `job_close_time` datetime DEFAULT NULL,
  `csc_conversion_number` varchar(100) DEFAULT NULL,
  `driver_name` varchar(200) DEFAULT NULL,
  `job_card_close_date` datetime DEFAULT NULL,
  `location` varchar(500) DEFAULT NULL,
  `job_card_number` varchar(100) DEFAULT NULL,
  `odometer` int DEFAULT NULL,
  `claim_type` varchar(100) DEFAULT NULL,
  `parts_amount` decimal(12,2) DEFAULT '0.00',
  `labour_amount` decimal(12,2) DEFAULT '0.00',
  `description_remarks` text,
  `current_status` varchar(100) NOT NULL DEFAULT 'Complaint Received',
  `status_history` text,
  `tata_complaint_number` varchar(100) DEFAULT NULL,
  `driver_mobile` varchar(50) DEFAULT NULL,
  `alternate_mobile` varchar(50) DEFAULT NULL,
  `fleet_owner` varchar(200) DEFAULT NULL,
  `fleet_manager` varchar(200) DEFAULT NULL,
  `fleet_manager_mobile` varchar(50) DEFAULT NULL,
  `preferred_workshop_id` int DEFAULT NULL,
  `auto_suggested_workshop_id` int DEFAULT NULL,
  `assigned_workshop_id` int DEFAULT NULL,
  `vehicle_movable` tinyint(1) DEFAULT '1',
  `towing_required` tinyint(1) DEFAULT '0',
  `parts_required` tinyint(1) DEFAULT '0',
  `resolved_at_site` tinyint(1) DEFAULT '0',
  `gps_latitude` decimal(9,6) DEFAULT NULL,
  `gps_longitude` decimal(9,6) DEFAULT NULL,
  `gps_address` text,
  `gps_maps_link` text,
  `priority` varchar(50) DEFAULT NULL,
  `sla_limit_hours` int DEFAULT NULL,
  `assigned_advisor_id` int DEFAULT NULL,
  `internal_breakdown_number` varchar(100) NOT NULL,
  `expected_eta` datetime DEFAULT NULL,
  `actual_arrival_time` datetime DEFAULT NULL,
  `delay_minutes` int DEFAULT '0',
  `delay_reason` text,
  PRIMARY KEY (`breakdown_id`),
  UNIQUE KEY `internal_breakdown_number` (`internal_breakdown_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `business_rules`
--
DROP TABLE IF EXISTS `business_rules`;
CREATE TABLE `business_rules` (
  `rule_id` varchar(100) NOT NULL,
  `rule_name` varchar(255) NOT NULL,
  `rule_group` varchar(100) NOT NULL,
  `condition_json` text NOT NULL,
  `action_json` text NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`),
  UNIQUE KEY `rule_name` (`rule_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `carry_forward_log`
--
DROP TABLE IF EXISTS `carry_forward_log`;
CREATE TABLE `carry_forward_log` (
  `cf_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_id` int unsigned NOT NULL,
  `original_date` date NOT NULL,
  `carry_date` date NOT NULL,
  `reason` text,
  `cf_status` enum('Pending','Resolved','Escalated') NOT NULL DEFAULT 'Pending',
  `logged_by` int unsigned NOT NULL,
  `resolved_by` int unsigned DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cf_id`),
  KEY `job_card_id` (`job_card_id`),
  KEY `logged_by` (`logged_by`),
  KEY `resolved_by` (`resolved_by`),
  CONSTRAINT `carry_forward_log_ibfk_1` FOREIGN KEY (`job_card_id`) REFERENCES `job_card_master` (`job_card_id`),
  CONSTRAINT `carry_forward_log_ibfk_2` FOREIGN KEY (`logged_by`) REFERENCES `employee_master` (`employee_id`),
  CONSTRAINT `carry_forward_log_ibfk_3` FOREIGN KEY (`resolved_by`) REFERENCES `employee_master` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `carry_forward_logs`
--
DROP TABLE IF EXISTS `carry_forward_logs`;
CREATE TABLE `carry_forward_logs` (
  `cf_id` int NOT NULL,
  `job_id` int unsigned NOT NULL,
  `cf_reason` text NOT NULL,
  `raised_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `cf_status` text NOT NULL,
  `raised_at` text NOT NULL,
  `actioned_at` text,
  PRIMARY KEY (`cf_id`),
  KEY `fk_cfl_job` (`job_id`),
  CONSTRAINT `fk_cfl_job` FOREIGN KEY (`job_id`) REFERENCES `job_card_master` (`job_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `cctv_alerts`
--
DROP TABLE IF EXISTS `cctv_alerts`;
CREATE TABLE `cctv_alerts` (
  `alert_id` int NOT NULL AUTO_INCREMENT,
  `camera_ref` varchar(120) DEFAULT NULL,
  `camera_name` varchar(120) DEFAULT NULL,
  `alert_type` varchar(60) DEFAULT NULL,
  `severity` varchar(20) DEFAULT NULL,
  `zone` varchar(120) DEFAULT NULL,
  `description` varchar(512) DEFAULT NULL,
  `snapshot_url` varchar(512) DEFAULT NULL,
  `confidence` decimal(5,2) DEFAULT NULL,
  `detected_at` datetime DEFAULT NULL,
  `status` varchar(20) DEFAULT 'OPEN',
  `acknowledged_by` varchar(120) DEFAULT NULL,
  `acknowledged_at` datetime DEFAULT NULL,
  `dedupe_key` varchar(160) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`alert_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `cctv_cameras`
--
DROP TABLE IF EXISTS `cctv_cameras`;
CREATE TABLE `cctv_cameras` (
  `camera_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) DEFAULT NULL,
  `zone` varchar(120) DEFAULT NULL,
  `vendor` varchar(80) DEFAULT NULL,
  `stream_url` varchar(512) DEFAULT NULL,
  `external_ref` varchar(120) DEFAULT NULL,
  `bay_id` int DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`camera_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `cctv_settings`
--
DROP TABLE IF EXISTS `cctv_settings`;
CREATE TABLE `cctv_settings` (
  `id` int NOT NULL,
  `webhook_key` varchar(255) DEFAULT NULL,
  `dedupe_seconds` int DEFAULT '60',
  `enabled` tinyint(1) DEFAULT '1',
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `communication_logs`
--
DROP TABLE IF EXISTS `communication_logs`;
CREATE TABLE `communication_logs` (
  `log_id` varchar(100) NOT NULL,
  `customer_passport_id` varchar(100) NOT NULL,
  `channel` varchar(50) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `body_text` text NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_cl_cust_channel` (`customer_passport_id`,`channel`),
  CONSTRAINT `communication_logs_ibfk_1` FOREIGN KEY (`customer_passport_id`) REFERENCES `customer_passports` (`customer_passport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `customer_feedback`
--
DROP TABLE IF EXISTS `customer_feedback`;
CREATE TABLE `customer_feedback` (
  `feedback_id` varchar(100) NOT NULL,
  `customer_passport_id` varchar(100) NOT NULL,
  `job_id` int unsigned NOT NULL,
  `csi_score` int DEFAULT NULL,
  `nps_score` int DEFAULT NULL,
  `workshop_rating` int DEFAULT NULL,
  `advisor_rating` int DEFAULT NULL,
  `technician_rating` int DEFAULT NULL,
  `comments` text,
  `resolved_quality` varchar(50) DEFAULT 'EXCELLENT',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  KEY `idx_cf_cust_job` (`customer_passport_id`,`job_id`),
  KEY `customer_feedback_ibfk_2` (`job_id`),
  CONSTRAINT `customer_feedback_ibfk_1` FOREIGN KEY (`customer_passport_id`) REFERENCES `customer_passports` (`customer_passport_id`),
  CONSTRAINT `customer_feedback_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `job_card_master` (`job_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `customer_passports`
--
DROP TABLE IF EXISTS `customer_passports`;
CREATE TABLE `customer_passports` (
  `customer_passport_id` varchar(100) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_type` varchar(50) DEFAULT 'Individual',
  `contact_phone` varchar(50) NOT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `pan_number` varchar(50) DEFAULT NULL,
  `gstin` varchar(50) DEFAULT NULL,
  `billing_address` text,
  `credit_limit` decimal(12,2) DEFAULT '0.00',
  `outstanding_amount` decimal(12,2) DEFAULT '0.00',
  `preferred_workshop_id` int DEFAULT NULL,
  `preferred_advisor_id` int DEFAULT NULL,
  `communication_preferences` varchar(255) DEFAULT 'SMS,Email',
  `digital_consent` tinyint(1) DEFAULT '1',
  `loyalty_status` varchar(50) DEFAULT 'BRONZE',
  `complaint_history` text,
  `warranty_history` text,
  `linked_user` varchar(255) DEFAULT NULL,
  `linked_vehicles` text,
  `linked_fleet` varchar(100) DEFAULT NULL,
  `registered_devices` text,
  `push_notification_tokens` text,
  `preferred_language` varchar(50) DEFAULT 'en',
  `notification_preferences` varchar(255) DEFAULT 'PUSH,SMS,EMAIL',
  `consent_history` text,
  `trusted_devices` text,
  `last_login` timestamp NULL DEFAULT NULL,
  `device_metadata` text,
  `security_audit_trail` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_passport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `dealer_configurations`
--
DROP TABLE IF EXISTS `dealer_configurations`;
CREATE TABLE `dealer_configurations` (
  `config_key` varchar(100) NOT NULL,
  `config_value` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `dealership_service_history`
--
DROP TABLE IF EXISTS `dealership_service_history`;
CREATE TABLE `dealership_service_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vrn` varchar(50) DEFAULT NULL,
  `vin` varchar(50) DEFAULT NULL,
  `service_date` varchar(100) DEFAULT NULL,
  `odometer` int DEFAULT NULL,
  `sr_type` varchar(100) DEFAULT NULL,
  `complaint_summary` text,
  `parts_cost` int DEFAULT '0',
  `labor_cost` int DEFAULT '0',
  `total_cost` int DEFAULT '0',
  `advisor_name` varchar(255) DEFAULT NULL,
  `technician_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `digital_approvals`
--
DROP TABLE IF EXISTS `digital_approvals`;
CREATE TABLE `digital_approvals` (
  `approval_id` varchar(100) NOT NULL,
  `job_id` int unsigned NOT NULL,
  `customer_passport_id` varchar(100) NOT NULL,
  `approval_type` varchar(100) NOT NULL,
  `approved_items` text NOT NULL,
  `signature_blob` text,
  `status` varchar(50) DEFAULT 'APPROVED',
  `ip_address` varchar(50) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`approval_id`),
  KEY `customer_passport_id` (`customer_passport_id`),
  KEY `idx_da_job_cust` (`job_id`,`customer_passport_id`),
  CONSTRAINT `digital_approvals_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `job_card_master` (`job_card_id`),
  CONSTRAINT `digital_approvals_ibfk_2` FOREIGN KEY (`customer_passport_id`) REFERENCES `customer_passports` (`customer_passport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `dim_vehicle_master`
--
DROP TABLE IF EXISTS `dim_vehicle_master`;
CREATE TABLE `dim_vehicle_master` (
  `chassis_no` varchar(100) NOT NULL,
  `registration_no` varchar(50) DEFAULT NULL,
  `engine_no` varchar(100) DEFAULT NULL,
  `product_line` varchar(100) DEFAULT NULL,
  `owner_account_name` varchar(255) DEFAULT NULL,
  `original_sale_date` date DEFAULT NULL,
  `tm_invoice_date` date DEFAULT NULL,
  `warranty_expiry_date` date DEFAULT NULL,
  `warranty_expiry_km` int DEFAULT NULL,
  `warranty_expiry_hours` int DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`chassis_no`),
  UNIQUE KEY `registration_no` (`registration_no`),
  KEY `idx_registration` (`registration_no`),
  KEY `idx_vehicle_reg` (`registration_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `dms_import_batch`
--
DROP TABLE IF EXISTS `dms_import_batch`;
CREATE TABLE `dms_import_batch` (
  `batch_id` int unsigned NOT NULL AUTO_INCREMENT,
  `imported_by` int unsigned NOT NULL,
  `import_date` date NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `total_rows` int unsigned DEFAULT '0',
  `matched_rows` int unsigned DEFAULT '0',
  `mismatched_rows` int unsigned DEFAULT '0',
  `not_found_rows` int unsigned DEFAULT '0',
  `status` enum('Processing','Completed','Failed') NOT NULL DEFAULT 'Processing',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_id`),
  KEY `imported_by` (`imported_by`),
  CONSTRAINT `dms_import_batch_ibfk_1` FOREIGN KEY (`imported_by`) REFERENCES `employee_master` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `dms_import_batches`
--
DROP TABLE IF EXISTS `dms_import_batches`;
CREATE TABLE `dms_import_batches` (
  `batch_id` int NOT NULL,
  `imported_by` int NOT NULL,
  `file_name` text NOT NULL,
  `total_rows` int NOT NULL,
  `matched_rows` int NOT NULL,
  `unmatched_rows` int NOT NULL,
  `status` text NOT NULL,
  `imported_at` text NOT NULL,
  PRIMARY KEY (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `dms_import_row`
--
DROP TABLE IF EXISTS `dms_import_row`;
CREATE TABLE `dms_import_row` (
  `row_id` int unsigned NOT NULL AUTO_INCREMENT,
  `batch_id` int unsigned NOT NULL,
  `job_card_no` varchar(30) NOT NULL,
  `vehicle_reg` varchar(20) NOT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `final_labour` decimal(10,2) DEFAULT '0.00',
  `final_spare` decimal(10,2) DEFAULT '0.00',
  `final_cons` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `invoice_no` varchar(30) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `match_status` enum('Matched','Mismatched','Not Found') NOT NULL DEFAULT 'Not Found',
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`row_id`),
  KEY `batch_id` (`batch_id`),
  CONSTRAINT `dms_import_row_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `dms_import_batch` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `dms_import_rows`
--
DROP TABLE IF EXISTS `dms_import_rows`;
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
  `matched_job_id` int DEFAULT NULL,
  `match_status` text NOT NULL,
  `conflict_reason` text,
  `resolved_by` int DEFAULT NULL,
  `resolved_at` text,
  `raw_data` text,
  PRIMARY KEY (`row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `driver_passports`
--
DROP TABLE IF EXISTS `driver_passports`;
CREATE TABLE `driver_passports` (
  `driver_passport_id` varchar(100) NOT NULL,
  `driver_name` varchar(255) NOT NULL,
  `contact_phone` varchar(50) NOT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `assigned_vehicle` varchar(50) DEFAULT NULL,
  `assigned_vehicles` text,
  `breakdown_reports` text,
  `complaint_quality` varchar(100) DEFAULT 'GOOD',
  `training_completion` tinyint(1) DEFAULT '0',
  `driving_observations` text,
  `safety_observations` text,
  `preferred_language` varchar(50) DEFAULT 'en',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`driver_passport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `employee_master`
--
DROP TABLE IF EXISTS `employee_master`;
CREATE TABLE `employee_master` (
  `employee_id` int unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `employee_code` varchar(20) DEFAULT NULL,
  `role` varchar(100) DEFAULT NULL,
  `employee_grade` varchar(50) DEFAULT NULL,
  `basic_salary` decimal(10,2) NOT NULL DEFAULT '0.00',
  `mobile` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `employee_code` (`employee_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `employees`
--
DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
  `employee_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `employee_code` varchar(50) NOT NULL,
  `role` varchar(100) NOT NULL,
  `employee_grade` varchar(50) NOT NULL DEFAULT 'Junior',
  `basic_salary` int NOT NULL DEFAULT '0',
  `mobile` varchar(50) NOT NULL DEFAULT '',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` varchar(100) DEFAULT NULL,
  `allocated_revenue` int DEFAULT '0',
  `target_revenue` int DEFAULT NULL,
  `paid_pct` varchar(50) DEFAULT NULL,
  `tml_claim_pct` varchar(50) DEFAULT NULL,
  `certification_level` varchar(50) DEFAULT NULL,
  `certification_date` varchar(100) DEFAULT NULL,
  `certification_expiry_date` varchar(100) DEFAULT NULL,
  `certification_remarks` text,
  `alt_mobile` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `workshop` varchar(100) DEFAULT NULL,
  `reporting_manager` varchar(100) DEFAULT NULL,
  `date_of_joining` varchar(50) DEFAULT NULL,
  `bank_details` text,
  `pan` varchar(20) DEFAULT NULL,
  `aadhaar` varchar(20) DEFAULT NULL,
  `workshop_id` int DEFAULT NULL,
  `shift_id` int DEFAULT NULL,
  `joining_date` varchar(100) DEFAULT NULL,
  `profile_photo_url` text,
  `face_embedding_reference` text,
  `is_workshop_employee` tinyint(1) DEFAULT '1',
  `is_technician_eligible` tinyint(1) DEFAULT '0',
  `is_labour_revenue_eligible` tinyint(1) DEFAULT '0',
  `is_bay_assignable` tinyint(1) DEFAULT '0',
  `is_breakdown_eligible` tinyint(1) DEFAULT '0',
  `is_qc_eligible` tinyint(1) DEFAULT '0',
  `is_warranty_eligible` tinyint(1) DEFAULT '0',
  `record_status` varchar(50) DEFAULT 'CANONICAL',
  `legacy_role` varchar(100) DEFAULT NULL,
  `crm_id` varchar(30) DEFAULT NULL,
  `lms_id` varchar(30) DEFAULT NULL,
  `profile_photo` longtext,
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  KEY `fk_employees_workshop` (`workshop_id`),
  KEY `fk_employees_shift` (`shift_id`),
  CONSTRAINT `fk_employees_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`),
  CONSTRAINT `fk_employees_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`workshop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `fact_invoices`
--
DROP TABLE IF EXISTS `fact_invoices`;
CREATE TABLE `fact_invoices` (
  `invoice_no` varchar(100) NOT NULL,
  `chassis_no` varchar(100) DEFAULT NULL,
  `registration_no` varchar(50) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `net_amount` decimal(15,2) DEFAULT NULL,
  `labour_amount` decimal(15,2) DEFAULT NULL,
  `spares_amount` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`invoice_no`),
  KEY `idx_invoice_chassis` (`chassis_no`),
  CONSTRAINT `fact_invoices_ibfk_1` FOREIGN KEY (`chassis_no`) REFERENCES `dim_vehicle_master` (`chassis_no`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `fact_service_history`
--
DROP TABLE IF EXISTS `fact_service_history`;
CREATE TABLE `fact_service_history` (
  `job_card_no` varchar(100) NOT NULL,
  `chassis_no` varchar(100) DEFAULT NULL,
  `registration_no` varchar(50) DEFAULT NULL,
  `job_card_open_date` date DEFAULT NULL,
  `job_card_close_date` date DEFAULT NULL,
  `odometer_reading` int DEFAULT NULL,
  `sr_no` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`job_card_no`),
  KEY `idx_service_chassis` (`chassis_no`),
  CONSTRAINT `fact_service_history_ibfk_1` FOREIGN KEY (`chassis_no`) REFERENCES `dim_vehicle_master` (`chassis_no`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `field_audit_history`
--
DROP TABLE IF EXISTS `field_audit_history`;
CREATE TABLE `field_audit_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_card_id` int NOT NULL,
  `field_name` varchar(100) NOT NULL,
  `old_value` text,
  `new_value` text,
  `user_id` int DEFAULT NULL,
  `user_name` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL,
  `branch_id` int DEFAULT '1',
  `reason` text,
  `workflow_stage` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_field_audit_jc` (`job_card_id`),
  KEY `idx_field_audit_field` (`field_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `field_override_requests`
--
DROP TABLE IF EXISTS `field_override_requests`;
CREATE TABLE `field_override_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_card_id` int NOT NULL,
  `field_name` varchar(100) NOT NULL,
  `requested_value` text NOT NULL,
  `requested_by_user_id` int DEFAULT NULL,
  `requested_by_name` varchar(100) NOT NULL,
  `requested_role` varchar(50) NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `request_reason` text NOT NULL,
  `approved_by_name` varchar(100) DEFAULT NULL,
  `approved_role` varchar(50) DEFAULT NULL,
  `approval_notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_override_jc` (`job_card_id`),
  KEY `idx_override_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `field_permissions`
--
DROP TABLE IF EXISTS `field_permissions`;
CREATE TABLE `field_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role` varchar(50) NOT NULL,
  `workflow_stage` varchar(50) NOT NULL DEFAULT 'ANY',
  `field_name` varchar(100) NOT NULL,
  `permission_level` enum('EDIT','READ_ONLY','HIDDEN','REQUIRES_APPROVAL','OVERRIDE','LOCKED') NOT NULL DEFAULT 'READ_ONLY',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_role_stage_field` (`role`,`workflow_stage`,`field_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `fleet_amc_contracts`
--
DROP TABLE IF EXISTS `fleet_amc_contracts`;
CREATE TABLE `fleet_amc_contracts` (
  `contract_id` varchar(100) NOT NULL,
  `fleet_passport_id` varchar(100) NOT NULL,
  `contract_reference` varchar(100) NOT NULL,
  `coverage_details` text,
  `expiry_date` date DEFAULT NULL,
  `total_value` decimal(12,2) DEFAULT '0.00',
  `usage_value` decimal(12,2) DEFAULT '0.00',
  `remaining_value` decimal(12,2) DEFAULT '0.00',
  `service_compliance_score` decimal(5,2) DEFAULT '100.00',
  `renewal_prediction` varchar(50) DEFAULT 'MEDIUM_LIKELIHOOD',
  `ai_renewal_recommendation` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`contract_id`),
  KEY `fleet_passport_id` (`fleet_passport_id`),
  CONSTRAINT `fleet_amc_contracts_ibfk_1` FOREIGN KEY (`fleet_passport_id`) REFERENCES `fleet_passports` (`fleet_passport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `fleet_breakdowns`
--
DROP TABLE IF EXISTS `fleet_breakdowns`;
CREATE TABLE `fleet_breakdowns` (
  `breakdown_id` varchar(100) NOT NULL,
  `fleet_passport_id` varchar(100) NOT NULL,
  `vehicle_vin` varchar(100) NOT NULL,
  `driver_passport_id` varchar(100) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `failure_pattern` text,
  `recovery_time_min` int DEFAULT '0',
  `repair_time_min` int DEFAULT '0',
  `repeat_failures_count` int DEFAULT '0',
  `technician_id` int DEFAULT NULL,
  `causal_part_no` varchar(100) DEFAULT NULL,
  `knowledge_learned` text,
  `dna_links` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`breakdown_id`),
  KEY `fleet_passport_id` (`fleet_passport_id`),
  CONSTRAINT `fleet_breakdowns_ibfk_1` FOREIGN KEY (`fleet_passport_id`) REFERENCES `fleet_passports` (`fleet_passport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `fleet_opportunities`
--
DROP TABLE IF EXISTS `fleet_opportunities`;
CREATE TABLE `fleet_opportunities` (
  `opportunity_id` varchar(100) NOT NULL,
  `fleet_passport_id` varchar(100) NOT NULL,
  `opportunity_type` varchar(100) NOT NULL,
  `details` text NOT NULL,
  `assigned_to` int DEFAULT NULL,
  `status` varchar(50) DEFAULT 'OPEN',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`opportunity_id`),
  KEY `fleet_passport_id` (`fleet_passport_id`),
  CONSTRAINT `fleet_opportunities_ibfk_1` FOREIGN KEY (`fleet_passport_id`) REFERENCES `fleet_passports` (`fleet_passport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `fleet_passports`
--
DROP TABLE IF EXISTS `fleet_passports`;
CREATE TABLE `fleet_passports` (
  `fleet_passport_id` varchar(100) NOT NULL,
  `fleet_name` varchar(255) NOT NULL,
  `fleet_owner_passport_id` varchar(100) NOT NULL,
  `operational_region` varchar(100) DEFAULT NULL,
  `total_vehicles` int DEFAULT '0',
  `amc_contract_reference` varchar(100) DEFAULT NULL,
  `sla_priority_level` varchar(50) DEFAULT 'MEDIUM',
  `company` varchar(255) DEFAULT NULL,
  `gst` varchar(100) DEFAULT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `fleet_type` varchar(100) DEFAULT NULL,
  `fleet_size` int DEFAULT '0',
  `primary_contact` varchar(255) DEFAULT NULL,
  `fleet_manager` varchar(255) DEFAULT NULL,
  `regional_manager` varchar(255) DEFAULT NULL,
  `preferred_workshop_id` int DEFAULT NULL,
  `preferred_service_advisor_id` int DEFAULT NULL,
  `warranty_agreements` text,
  `communication_preferences` varchar(255) DEFAULT 'EMAIL',
  `relationship_health_score` decimal(5,2) DEFAULT '100.00',
  `fleet_health_score` decimal(5,2) DEFAULT '100.00',
  `fleet_timeline` text,
  `knowledge_links` text,
  `dna_links` text,
  `linked_vehicles` text,
  `linked_drivers` text,
  `linked_contracts` text,
  `linked_warranty` text,
  `telematics_config` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`fleet_passport_id`),
  KEY `fleet_owner_passport_id` (`fleet_owner_passport_id`),
  CONSTRAINT `fleet_passports_ibfk_1` FOREIGN KEY (`fleet_owner_passport_id`) REFERENCES `customer_passports` (`customer_passport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `fsb_master`
--
DROP TABLE IF EXISTS `fsb_master`;
CREATE TABLE `fsb_master` (
  `fsb_id` int NOT NULL AUTO_INCREMENT,
  `job_card_id` int DEFAULT NULL,
  `fsb_status` enum('Settled','Rejected','Deviation') DEFAULT 'Settled',
  PRIMARY KEY (`fsb_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `gate_entries`
--
DROP TABLE IF EXISTS `gate_entries`;
CREATE TABLE `gate_entries` (
  `gate_id` int NOT NULL,
  `token_number` varchar(255) NOT NULL,
  `vrn` varchar(255) NOT NULL,
  `vehicle_model` varchar(255) NOT NULL,
  `chassis_number` varchar(255) NOT NULL,
  `km_reading` int NOT NULL,
  `driver_name` varchar(255) NOT NULL,
  `driver_mobile` varchar(255) NOT NULL,
  `driver_image` longtext,
  `waiting_time_mins` int NOT NULL,
  `status` varchar(255) NOT NULL,
  `created_at` varchar(255) NOT NULL,
  PRIMARY KEY (`gate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `gm_override_log`
--
DROP TABLE IF EXISTS `gm_override_log`;
CREATE TABLE `gm_override_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `gm_user_id` int DEFAULT NULL,
  `gm_name` varchar(191) DEFAULT NULL,
  `job_id` int DEFAULT NULL,
  `job_card_no` varchar(64) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `jc_state` varchar(64) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gm_override_job` (`job_id`),
  KEY `idx_gm_override_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `graph_edge_history`
--
DROP TABLE IF EXISTS `graph_edge_history`;
CREATE TABLE `graph_edge_history` (
  `history_id` varchar(100) NOT NULL,
  `edge_id` varchar(100) NOT NULL,
  `source_node_id` varchar(100) NOT NULL,
  `target_node_id` varchar(100) NOT NULL,
  `relationship_type` varchar(100) NOT NULL,
  `properties_json` text,
  `version` int NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `graph_edges`
--
DROP TABLE IF EXISTS `graph_edges`;
CREATE TABLE `graph_edges` (
  `edge_id` varchar(100) NOT NULL,
  `source_node_id` varchar(100) NOT NULL,
  `target_node_id` varchar(100) NOT NULL,
  `relationship_type` varchar(100) NOT NULL,
  `properties_json` text,
  `is_active` tinyint(1) DEFAULT '1',
  `version` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`edge_id`),
  UNIQUE KEY `idx_source_target_rel` (`source_node_id`,`target_node_id`,`relationship_type`),
  KEY `fk_target_node` (`target_node_id`),
  KEY `idx_relationship_type` (`relationship_type`),
  CONSTRAINT `fk_source_node` FOREIGN KEY (`source_node_id`) REFERENCES `graph_nodes` (`node_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_target_node` FOREIGN KEY (`target_node_id`) REFERENCES `graph_nodes` (`node_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `graph_nodes`
--
DROP TABLE IF EXISTS `graph_nodes`;
CREATE TABLE `graph_nodes` (
  `node_id` varchar(100) NOT NULL,
  `node_type` varchar(100) NOT NULL,
  `node_name` varchar(255) NOT NULL,
  `properties_json` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`node_id`),
  KEY `idx_node_type` (`node_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `invoices`
--
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chassis_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registration_no` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sr_assigned_to` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_date` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_format` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `final_labour_amount` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `final_spares_amount` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `final_consolidated_amt` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sr_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancellation_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `final_consolidated_amount` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vrn` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`invoice_no`),
  KEY `idx_inv_chassis` (`chassis_no`),
  KEY `idx_inv_reg_no` (`registration_no`),
  KEY `idx_inv_sr_no` (`sr_no`),
  KEY `idx_inv_date_status` (`invoice_date`,`invoice_status`),
  KEY `idx_inv_type_date` (`invoice_type`,`invoice_date`),
  CONSTRAINT `fk_inv_chassis` FOREIGN KEY (`chassis_no`) REFERENCES `vehicle_master` (`chassis_no`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for `jc_activity_log`
--
DROP TABLE IF EXISTS `jc_activity_log`;
CREATE TABLE `jc_activity_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_card_id` int NOT NULL,
  `job_card_no` varchar(64) NOT NULL,
  `action_type` varchar(80) NOT NULL,
  `action_detail` text,
  `old_snapshot` json DEFAULT NULL,
  `new_snapshot` json DEFAULT NULL,
  `actor_user_id` int DEFAULT NULL,
  `actor_name` varchar(255) DEFAULT NULL,
  `actor_role` varchar(100) DEFAULT NULL,
  `ip_address` varchar(100) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_jcal_jc_no` (`job_card_no`),
  KEY `idx_jcal_jc_id` (`job_card_id`),
  KEY `idx_jcal_created` (`created_at`),
  KEY `idx_jcal_actor` (`actor_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `jc_update_requests`
--
DROP TABLE IF EXISTS `jc_update_requests`;
CREATE TABLE `jc_update_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_id` int NOT NULL,
  `jc_number` varchar(100) DEFAULT NULL,
  `requested_by_user_id` int DEFAULT NULL,
  `requested_by_name` varchar(255) DEFAULT NULL,
  `requested_by_role` varchar(100) DEFAULT NULL,
  `message` text NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'open',
  `resolution_note` text,
  `resolved_by_user_id` int DEFAULT NULL,
  `resolved_by_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_jcur_job` (`job_card_id`),
  KEY `idx_jcur_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `job_card_complaint_history`
--
DROP TABLE IF EXISTS `job_card_complaint_history`;
CREATE TABLE `job_card_complaint_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_card_id` int NOT NULL,
  `version_number` int NOT NULL,
  `complaint_text` text NOT NULL,
  `edited_by_user_id` int DEFAULT NULL,
  `edited_by_name` varchar(100) NOT NULL,
  `edited_role` varchar(50) NOT NULL,
  `branch_id` int DEFAULT '1',
  `edit_reason` text,
  `source` varchar(50) DEFAULT 'WEB_UI',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_jc_id` (`job_card_id`),
  KEY `idx_jc_ver` (`job_card_id`,`version_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `job_card_master`
--
DROP TABLE IF EXISTS `job_card_master`;
CREATE TABLE `job_card_master` (
  `job_card_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_no` varchar(30) NOT NULL,
  `bay_id` int unsigned DEFAULT NULL,
  `vehicle_reg` varchar(50) DEFAULT NULL,
  `chassis_no` varchar(50) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `driver_mobile` varchar(15) NOT NULL DEFAULT '0000000000',
  `mobile` varchar(15) DEFAULT NULL,
  `service_type` enum('Oil Change','2 Service','3 Service','FIP','Gear Box','Low Pickup','Engine Oil Leakage','Check Nut','Balon','Lift XL','General Repair','Electrical','AC Service','Wheel Alignment','Other') DEFAULT NULL,
  `job_status` enum('Open','In Progress','Waiting Parts','Ready','Delivered','Carry Forward','Assigned','Unassigned','In Queue') DEFAULT 'Unassigned',
  `assigned_to` int unsigned DEFAULT NULL,
  `etd` datetime DEFAULT NULL,
  `actual_delivery` datetime DEFAULT NULL,
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `live_status` varchar(50) DEFAULT 0xF09F94B52057616974696E6720416C6C6F636174696F6E,
  `billing_status` varchar(50) DEFAULT 'Pending',
  `tech_slot_1` int DEFAULT NULL,
  `tech_slot_2` int DEFAULT NULL,
  `tech_slot_3` int DEFAULT NULL,
  `tech_slot_4` int DEFAULT NULL,
  `tech_slot_5` int DEFAULT NULL,
  `jc_revenue` decimal(10,2) DEFAULT '0.00',
  `crm_jc_no` varchar(50) DEFAULT NULL,
  `vin` varchar(50) DEFAULT NULL,
  `estimated_amount` decimal(10,2) DEFAULT '0.00',
  `invoice_no` varchar(50) DEFAULT NULL,
  `gate_out_time` datetime DEFAULT NULL,
  `last_service_date` varchar(100) DEFAULT NULL,
  `odometer_reading` int DEFAULT NULL,
  `invoice_ocr_data` text,
  `service_advisor` varchar(255) DEFAULT NULL,
  `numberplate_photo` text,
  `odometer_photo` text,
  `crm_arrival_at` datetime DEFAULT NULL,
  `crm_jc_started_at` datetime DEFAULT NULL,
  `crm_expected_delivery_at` datetime DEFAULT NULL,
  `crm_jc_completed_at` datetime DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `job_type` varchar(50) DEFAULT 'Running Repair',
  PRIMARY KEY (`job_card_id`),
  UNIQUE KEY `job_card_no` (`job_card_no`),
  KEY `bay_id` (`bay_id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `created_by` (`created_by`),
  KEY `idx_jcm_vehicle_reg` (`vehicle_reg`),
  KEY `idx_jcm_chassis_no` (`chassis_no`),
  KEY `idx_jcm_crm_jc_no` (`crm_jc_no`),
  KEY `idx_jcm_job_status` (`job_status`),
  CONSTRAINT `job_card_master_ibfk_1` FOREIGN KEY (`bay_id`) REFERENCES `bay_master` (`bay_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `job_card_parts`
--
DROP TABLE IF EXISTS `job_card_parts`;
CREATE TABLE `job_card_parts` (
  `part_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_id` int unsigned NOT NULL,
  `job_card_no` varchar(30) NOT NULL,
  `part_code` varchar(50) DEFAULT NULL,
  `part_name` varchar(100) NOT NULL,
  `quantity` decimal(10,2) DEFAULT '1.00',
  `unit_price` decimal(10,2) DEFAULT '0.00',
  `total_price` decimal(10,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int unsigned NOT NULL,
  PRIMARY KEY (`part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `job_card_service_item`
--
DROP TABLE IF EXISTS `job_card_service_item`;
CREATE TABLE `job_card_service_item` (
  `service_item_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_id` int unsigned NOT NULL,
  `job_card_no` varchar(30) NOT NULL,
  `service_code` varchar(50) DEFAULT NULL,
  `service_desc` varchar(200) NOT NULL,
  `labour_amount` decimal(10,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int unsigned NOT NULL,
  PRIMARY KEY (`service_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `job_card_technician`
--
DROP TABLE IF EXISTS `job_card_technician`;
CREATE TABLE `job_card_technician` (
  `jct_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_id` int unsigned NOT NULL,
  `job_card_no` varchar(30) NOT NULL,
  `technician_id` int unsigned NOT NULL,
  `role_type` varchar(30) NOT NULL,
  `weightage` decimal(5,2) DEFAULT '0.00',
  `time_in` datetime DEFAULT NULL,
  `time_out` datetime DEFAULT NULL,
  `hours_worked` decimal(5,2) DEFAULT '0.00',
  `labour_share` decimal(10,2) DEFAULT '0.00',
  `efficiency_score` decimal(5,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int unsigned NOT NULL,
  PRIMARY KEY (`jct_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `job_cards`
--
DROP TABLE IF EXISTS `job_cards`;
CREATE TABLE `job_cards` (
  `job_id` int NOT NULL AUTO_INCREMENT,
  `job_card_no` varchar(50) NOT NULL,
  `crm_job_card_no` varchar(50) DEFAULT NULL,
  `vrn` varchar(50) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_mobile` varchar(50) NOT NULL,
  `vehicle_make` varchar(50) NOT NULL DEFAULT 'Tata',
  `vehicle_model` varchar(100) NOT NULL,
  `vehicle_year` int NOT NULL DEFAULT '2024',
  `km_reading` int DEFAULT NULL,
  `sr_type_id` int NOT NULL DEFAULT '1',
  `job_description` text,
  `priority` varchar(50) NOT NULL DEFAULT 'Normal',
  `bay_id` int DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Waiting',
  `etd` varchar(100) DEFAULT NULL,
  `started_at` varchar(100) DEFAULT NULL,
  `completed_at` varchar(100) DEFAULT NULL,
  `invoiced_at` varchar(100) DEFAULT NULL,
  `created_by` int NOT NULL DEFAULT '1',
  `created_at` varchar(100) NOT NULL,
  `updated_at` varchar(100) DEFAULT NULL,
  `workshop_stage` varchar(100) DEFAULT NULL,
  `l1_delay` varchar(100) DEFAULT NULL,
  `l2_delay` varchar(100) DEFAULT NULL,
  `l3_delay` varchar(100) DEFAULT NULL,
  `l5_delay` varchar(100) DEFAULT NULL,
  `delay_notes` text,
  `time_slot` varchar(50) DEFAULT NULL,
  `tat_status` varchar(50) DEFAULT NULL,
  `pending_reason` text,
  `remarks` text,
  `date_in` varchar(50) DEFAULT NULL,
  `time_in` varchar(50) DEFAULT NULL,
  `expected_date_out` varchar(50) DEFAULT NULL,
  `expected_time_of_completion` varchar(50) DEFAULT NULL,
  `time_out` varchar(50) DEFAULT NULL,
  `date_completed` varchar(50) DEFAULT NULL,
  `bay_no` varchar(50) DEFAULT NULL,
  `service_advisor` varchar(255) DEFAULT NULL,
  `technician_name` varchar(255) DEFAULT NULL,
  `no_of_laborers` int DEFAULT '1',
  `actual_time_taken` varchar(50) DEFAULT NULL,
  `numberplate_photo` text,
  `odometer_photo` text,
  `labor_price` decimal(10,2) DEFAULT '0.00',
  `parts_price` decimal(10,2) DEFAULT '0.00',
  `vin` varchar(50) DEFAULT NULL,
  `last_service_date` varchar(100) DEFAULT NULL,
  `odometer_reading` int DEFAULT NULL,
  `invoice_ocr_data` text,
  `gate_out_time` varchar(100) DEFAULT NULL,
  `job_type` varchar(50) DEFAULT 'Running Repair',
  PRIMARY KEY (`job_id`),
  KEY `idx_job_cards_vrn` (`vrn`(20)),
  KEY `idx_job_cards_status` (`status`),
  KEY `idx_job_cards_created` (`created_at`),
  KEY `fk_job_cards_bay` (`bay_id`),
  KEY `fk_job_cards_sr` (`sr_type_id`),
  KEY `fk_job_cards_creator` (`created_by`),
  KEY `idx_jc_status_bay` (`status`,`bay_id`),
  CONSTRAINT `fk_job_cards_bay` FOREIGN KEY (`bay_id`) REFERENCES `bays` (`bay_id`),
  CONSTRAINT `fk_job_cards_creator` FOREIGN KEY (`created_by`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_job_cards_sr` FOREIGN KEY (`sr_type_id`) REFERENCES `sr_types` (`sr_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `job_revenue_split`
--
DROP TABLE IF EXISTS `job_revenue_split`;
CREATE TABLE `job_revenue_split` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `allocated_amount` decimal(10,2) DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `job_revenue_split_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `backup_legacy_job_cards` (`job_id`),
  CONSTRAINT `job_revenue_split_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `backup_legacy_employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `job_revenue_split_details`
--
DROP TABLE IF EXISTS `job_revenue_split_details`;
CREATE TABLE `job_revenue_split_details` (
  `detail_id` int NOT NULL AUTO_INCREMENT,
  `revenue_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `tech_role` text NOT NULL,
  `split_pct` int NOT NULL,
  `split_amount` int NOT NULL,
  PRIMARY KEY (`detail_id`),
  KEY `fk_jrsd_employee` (`employee_id`),
  KEY `fk_jrsd_revenue` (`revenue_id`),
  CONSTRAINT `fk_jrsd_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_jrsd_revenue` FOREIGN KEY (`revenue_id`) REFERENCES `job_revenues` (`revenue_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `job_revenues`
--
DROP TABLE IF EXISTS `job_revenues`;
CREATE TABLE `job_revenues` (
  `revenue_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int unsigned NOT NULL,
  `labour_amount` int NOT NULL,
  `parts_amount` int NOT NULL,
  `total_amount` int NOT NULL,
  `split_id` int NOT NULL,
  `calculated_at` text,
  PRIMARY KEY (`revenue_id`),
  UNIQUE KEY `uq_job_revenues_job` (`job_id`),
  CONSTRAINT `fk_job_rev_job` FOREIGN KEY (`job_id`) REFERENCES `job_card_master` (`job_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `job_technician_maps`
--
DROP TABLE IF EXISTS `job_technician_maps`;
CREATE TABLE `job_technician_maps` (
  `map_id` int NOT NULL,
  `job_id` int unsigned NOT NULL,
  `employee_id` int NOT NULL,
  `tech_role` text NOT NULL,
  `assigned_at` text,
  PRIMARY KEY (`map_id`),
  KEY `idx_jtm_employee` (`employee_id`),
  KEY `idx_jtm_job` (`job_id`),
  KEY `idx_jtm_job_emp` (`job_id`,`employee_id`),
  CONSTRAINT `fk_jtm_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_jtm_job` FOREIGN KEY (`job_id`) REFERENCES `job_card_master` (`job_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `login_history`
--
DROP TABLE IF EXISTS `login_history`;
CREATE TABLE `login_history` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `login_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) DEFAULT NULL,
  `status` enum('success','failed') DEFAULT 'success',
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `login_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `models`
--
DROP TABLE IF EXISTS `models`;
CREATE TABLE `models` (
  `model_id` int NOT NULL AUTO_INCREMENT,
  `model_name` varchar(255) NOT NULL,
  PRIMARY KEY (`model_id`),
  UNIQUE KEY `model_name` (`model_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `modules`
--
DROP TABLE IF EXISTS `modules`;
CREATE TABLE `modules` (
  `module_id` int NOT NULL AUTO_INCREMENT,
  `module_name` varchar(100) NOT NULL,
  PRIMARY KEY (`module_id`),
  UNIQUE KEY `module_name` (`module_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `ocr_evidence`
--
DROP TABLE IF EXISTS `ocr_evidence`;
CREATE TABLE `ocr_evidence` (
  `evidence_id` varchar(50) NOT NULL,
  `ocr_type` enum('NUMBERPLATE','INVOICE','MANUAL_JOBCARD','PARTS_PHOTO','FUEL_GAUGE','ODOMETER','WORK_PHOTO','VEHICLE_CONDITION','DOCUMENT') NOT NULL,
  `job_card_no` varchar(50) DEFAULT NULL,
  `gate_entry_id` varchar(100) DEFAULT NULL,
  `vrn` varchar(50) DEFAULT NULL,
  `photo_url` varchar(1000) DEFAULT NULL,
  `photo_size_bytes` int DEFAULT NULL,
  `captured_at` datetime NOT NULL,
  `captured_by` int DEFAULT NULL,
  `ocr_provider` varchar(50) DEFAULT NULL,
  `ocr_result_json` longtext,
  `ocr_confidence` decimal(5,2) DEFAULT NULL,
  `retention_expiry` date NOT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `branch_id` varchar(50) DEFAULT 'BR-SEDAM',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`evidence_id`),
  KEY `idx_ocr_evidence_type` (`ocr_type`),
  KEY `idx_ocr_evidence_vrn` (`vrn`),
  KEY `idx_ocr_evidence_jc` (`job_card_no`),
  KEY `idx_ocr_evidence_retention` (`retention_expiry`,`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `oem_api_providers`
--
DROP TABLE IF EXISTS `oem_api_providers`;
CREATE TABLE `oem_api_providers` (
  `provider_key` varchar(40) NOT NULL,
  `label` varchar(80) DEFAULT NULL,
  `base_url` varchar(500) DEFAULT NULL,
  `auth_mode` varchar(20) NOT NULL DEFAULT 'api_key',
  `api_key` varchar(1000) DEFAULT NULL,
  `key_header` varchar(80) DEFAULT 'X-API-Key',
  `token_url` varchar(500) DEFAULT NULL,
  `client_id` varchar(255) DEFAULT NULL,
  `client_secret` varchar(1000) DEFAULT NULL,
  `lookup_path` varchar(300) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '0',
  `updated_by` varchar(50) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`provider_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `oem_queries`
--
DROP TABLE IF EXISTS `oem_queries`;
CREATE TABLE `oem_queries` (
  `query_id` varchar(100) NOT NULL,
  `claim_id` varchar(100) NOT NULL,
  `query_text` text NOT NULL,
  `status` varchar(50) DEFAULT 'PENDING',
  `evidence_requested` varchar(255) DEFAULT NULL,
  `engineer_remarks` text,
  `response_text` text,
  `response_time_sec` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`query_id`),
  KEY `claim_id` (`claim_id`),
  CONSTRAINT `oem_queries_ibfk_1` FOREIGN KEY (`claim_id`) REFERENCES `warranty_claims` (`claim_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `oem_vehicle_cache`
--
DROP TABLE IF EXISTS `oem_vehicle_cache`;
CREATE TABLE `oem_vehicle_cache` (
  `vrn` varchar(40) NOT NULL,
  `provider` varchar(40) NOT NULL DEFAULT 'tmsa_cv',
  `chassis_no` varchar(60) DEFAULT NULL,
  `model` varchar(120) DEFAULT NULL,
  `payload` longtext,
  `fetched_by` varchar(50) DEFAULT NULL,
  `fetched_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`vrn`),
  KEY `idx_ovc_chassis` (`chassis_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `overtime_api_logs`
--
DROP TABLE IF EXISTS `overtime_api_logs`;
CREATE TABLE `overtime_api_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `request_id` varchar(100) NOT NULL,
  `user_id` int DEFAULT NULL,
  `api_endpoint` varchar(255) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `device_info` varchar(255) NOT NULL,
  `execution_duration_ms` int NOT NULL,
  `response_status` int NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  UNIQUE KEY `request_id` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `overtime_attachments`
--
DROP TABLE IF EXISTS `overtime_attachments`;
CREATE TABLE `overtime_attachments` (
  `attachment_id` int NOT NULL AUTO_INCREMENT,
  `ot_id` int NOT NULL,
  `attachment_type` varchar(50) NOT NULL,
  `file_path` text NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attachment_id`),
  KEY `ot_id` (`ot_id`),
  CONSTRAINT `overtime_attachments_ibfk_1` FOREIGN KEY (`ot_id`) REFERENCES `overtime_requests` (`ot_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `overtime_audit_logs`
--
DROP TABLE IF EXISTS `overtime_audit_logs`;
CREATE TABLE `overtime_audit_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `ot_id` int NOT NULL,
  `action` varchar(50) NOT NULL,
  `actor_id` int NOT NULL,
  `actor_role` varchar(100) NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) NOT NULL,
  `payload_diff` text NOT NULL,
  PRIMARY KEY (`log_id`),
  KEY `ot_id` (`ot_id`),
  CONSTRAINT `overtime_audit_logs_ibfk_1` FOREIGN KEY (`ot_id`) REFERENCES `overtime_requests` (`ot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `overtime_requests`
--
DROP TABLE IF EXISTS `overtime_requests`;
CREATE TABLE `overtime_requests` (
  `ot_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `ot_category` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `shift_id` int NOT NULL,
  `ot_start_time` time NOT NULL,
  `ot_end_time` time NOT NULL,
  `total_hours` decimal(5,2) NOT NULL,
  `benefit_type` varchar(100) NOT NULL,
  `ot_reason_category` varchar(100) NOT NULL,
  `job_card_id` int unsigned DEFAULT NULL,
  `workshop_id` int DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `work_description` text,
  `comp_attendance_credit_earned` decimal(3,2) DEFAULT '0.00',
  `snapshot_basic_salary` decimal(12,2) DEFAULT NULL,
  `snapshot_days_in_month` int DEFAULT NULL,
  `hourly_salary_rate` decimal(10,2) DEFAULT NULL,
  `calculated_amount` decimal(12,2) DEFAULT NULL,
  `max_allowed_cap` decimal(12,2) DEFAULT NULL,
  `final_payable_amount` decimal(12,2) DEFAULT NULL,
  `capping_reason` varchar(255) DEFAULT NULL,
  `device_name` varchar(100) NOT NULL,
  `operating_system` varchar(100) NOT NULL,
  `app_version` varchar(50) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `device_time` timestamp NOT NULL,
  `server_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `time_difference_seconds` int NOT NULL,
  `face_verification_provider` varchar(50) DEFAULT NULL,
  `face_match_result` varchar(50) DEFAULT NULL,
  `face_match_score` decimal(4,3) DEFAULT NULL,
  `face_verification_time` timestamp NULL DEFAULT NULL,
  `ocr_provider` varchar(50) DEFAULT NULL,
  `ocr_confidence` decimal(4,3) DEFAULT NULL,
  `ocr_verification_time` timestamp NULL DEFAULT NULL,
  `gps_lat` decimal(9,6) NOT NULL,
  `gps_lng` decimal(9,6) NOT NULL,
  `gps_matched` tinyint(1) NOT NULL DEFAULT '0',
  `ai_recommendation_status` varchar(50) DEFAULT 'PENDING',
  `ai_flags` varchar(255) DEFAULT NULL,
  `current_level` int NOT NULL DEFAULT '1',
  `current_status` varchar(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
  `payroll_period` varchar(20) DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ot_id`),
  KEY `employee_id` (`employee_id`),
  KEY `shift_id` (`shift_id`),
  KEY `workshop_id` (`workshop_id`),
  KEY `overtime_requests_ibfk_4` (`job_card_id`),
  CONSTRAINT `overtime_requests_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `overtime_requests_ibfk_2` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`shift_id`),
  CONSTRAINT `overtime_requests_ibfk_3` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`workshop_id`),
  CONSTRAINT `overtime_requests_ibfk_4` FOREIGN KEY (`job_card_id`) REFERENCES `job_card_master` (`job_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `overtime_workflow_history`
--
DROP TABLE IF EXISTS `overtime_workflow_history`;
CREATE TABLE `overtime_workflow_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `ot_id` int NOT NULL,
  `level` int NOT NULL,
  `approver_id` int NOT NULL,
  `approver_role` varchar(100) NOT NULL,
  `action_date` date NOT NULL,
  `action_time` time NOT NULL,
  `decision` varchar(50) NOT NULL,
  `remarks` text,
  PRIMARY KEY (`history_id`),
  KEY `ot_id` (`ot_id`),
  CONSTRAINT `overtime_workflow_history_ibfk_1` FOREIGN KEY (`ot_id`) REFERENCES `overtime_requests` (`ot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `ownership_timeline`
--
DROP TABLE IF EXISTS `ownership_timeline`;
CREATE TABLE `ownership_timeline` (
  `event_id` varchar(100) NOT NULL,
  `customer_passport_id` varchar(100) NOT NULL,
  `vehicle_vin` varchar(100) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `event_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `description` text NOT NULL,
  `metadata_payload` text,
  PRIMARY KEY (`event_id`),
  KEY `idx_ot_cust_vin` (`customer_passport_id`,`vehicle_vin`),
  CONSTRAINT `ownership_timeline_ibfk_1` FOREIGN KEY (`customer_passport_id`) REFERENCES `customer_passports` (`customer_passport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `pilot_support_settings`
--
DROP TABLE IF EXISTS `pilot_support_settings`;
CREATE TABLE `pilot_support_settings` (
  `settings_key` varchar(100) NOT NULL,
  `settings_value` varchar(255) NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`settings_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `product_backlog`
--
DROP TABLE IF EXISTS `product_backlog`;
CREATE TABLE `product_backlog` (
  `backlog_id` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(50) NOT NULL,
  `priority` varchar(50) DEFAULT 'MEDIUM',
  `severity` varchar(50) DEFAULT 'MEDIUM',
  `status` varchar(50) DEFAULT 'OPEN',
  `owner_id` int DEFAULT NULL,
  `target_version` varchar(50) DEFAULT 'v1.1',
  `business_value` int DEFAULT '0',
  `development_effort` int DEFAULT '1',
  `roi` int DEFAULT '0',
  `operational_impact` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`backlog_id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `product_backlog_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `productivity_alerts`
--
DROP TABLE IF EXISTS `productivity_alerts`;
CREATE TABLE `productivity_alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `alert_type` varchar(50) DEFAULT NULL,
  `severity` varchar(50) DEFAULT NULL,
  `trigger_value` decimal(10,2) DEFAULT NULL,
  `threshold_value` decimal(10,2) DEFAULT NULL,
  `alert_message` varchar(255) DEFAULT NULL,
  `recommended_action` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `productivity_alerts_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `backup_legacy_employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `profile_change_audit_log`
--
DROP TABLE IF EXISTS `profile_change_audit_log`;
CREATE TABLE `profile_change_audit_log` (
  `log_id` int unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `field_name` varchar(100) NOT NULL,
  `old_value` varchar(255) DEFAULT NULL,
  `new_value` varchar(255) DEFAULT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(100) DEFAULT NULL,
  `device_info` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `profile_update_requests`
--
DROP TABLE IF EXISTS `profile_update_requests`;
CREATE TABLE `profile_update_requests` (
  `request_id` int unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `mobile` varchar(50) DEFAULT NULL,
  `alt_mobile` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `ip_address` varchar(100) DEFAULT NULL,
  `device_info` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int DEFAULT NULL,
  PRIMARY KEY (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `qc_road_tests`
--
DROP TABLE IF EXISTS `qc_road_tests`;
CREATE TABLE `qc_road_tests` (
  `road_test_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `qc_checklist_ref` int DEFAULT NULL COMMENT 'rpt_qc_checklists.qc_checklist_id for this QC attempt',
  `branch_id` int NOT NULL,
  `tester_id` int NOT NULL,
  `tester_name` varchar(100) NOT NULL,
  `requirement_status` enum('REQUIRED','NOT_REQUIRED') NOT NULL,
  `requirement_set_by` int NOT NULL,
  `requirement_set_by_name` varchar(100) NOT NULL,
  `requirement_set_at` datetime NOT NULL,
  `status` enum('REQUIRED','NOT_REQUIRED','IN_PROGRESS','PASSED','FAILED') NOT NULL,
  `start_odometer` int DEFAULT NULL,
  `end_odometer` int DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`road_test_id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_branch_id` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `qrt_ingestor_settings`
--
DROP TABLE IF EXISTS `qrt_ingestor_settings`;
CREATE TABLE `qrt_ingestor_settings` (
  `id` int NOT NULL,
  `gmail_user` varchar(255) DEFAULT NULL,
  `app_password` varchar(255) DEFAULT NULL,
  `host` varchar(255) DEFAULT NULL,
  `port` int DEFAULT NULL,
  `mailbox` varchar(255) DEFAULT NULL,
  `sender_filter` varchar(255) DEFAULT NULL,
  `lookback_hours` int DEFAULT NULL,
  `poll_interval_ms` int DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT '1',
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `qrt_teams`
--
DROP TABLE IF EXISTS `qrt_teams`;
CREATE TABLE `qrt_teams` (
  `qrt_id` int NOT NULL AUTO_INCREMENT,
  `team_name` varchar(200) NOT NULL,
  `technician_id` int DEFAULT NULL,
  `assistant_id` int DEFAULT NULL,
  `helper_id` int DEFAULT NULL,
  `electrician_id` int DEFAULT NULL,
  `vehicle_no` varchar(100) DEFAULT NULL,
  `phone_numbers` varchar(200) DEFAULT NULL,
  `availability` tinyint(1) DEFAULT '1',
  `current_assignment` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`qrt_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `revenue_split_log`
--
DROP TABLE IF EXISTS `revenue_split_log`;
CREATE TABLE `revenue_split_log` (
  `split_id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_card_no` varchar(30) NOT NULL,
  `invoice_no` varchar(30) DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `vehicle_reg` varchar(20) NOT NULL,
  `service_type` varchar(50) DEFAULT NULL,
  `final_labour` decimal(10,2) DEFAULT '0.00',
  `final_spare` decimal(10,2) DEFAULT '0.00',
  `final_cons` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `labour_pct` decimal(5,2) DEFAULT '0.00',
  `spare_pct` decimal(5,2) DEFAULT '0.00',
  `cons_pct` decimal(5,2) DEFAULT '0.00',
  `recorded_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total_revenue` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`split_id`),
  KEY `recorded_by` (`recorded_by`),
  CONSTRAINT `revenue_split_log_ibfk_1` FOREIGN KEY (`recorded_by`) REFERENCES `employee_master` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `revenue_splits`
--
DROP TABLE IF EXISTS `revenue_splits`;
CREATE TABLE `revenue_splits` (
  `split_id` int NOT NULL,
  `combination_code` text NOT NULL,
  `combination_label` text NOT NULL,
  `person_count` int NOT NULL,
  `tech_pct` int NOT NULL,
  `co_tech_pct` int NOT NULL,
  `electrician_pct` int NOT NULL,
  `add_tech_pct` int NOT NULL,
  `uses_salary_wt` tinyint(1) NOT NULL,
  `senior_override` tinyint(1) NOT NULL,
  `notes` text,
  `is_active` tinyint(1) NOT NULL,
  PRIMARY KEY (`split_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `rework_logs`
--
DROP TABLE IF EXISTS `rework_logs`;
CREATE TABLE `rework_logs` (
  `rework_id` int NOT NULL,
  `original_job_id` int unsigned NOT NULL,
  `new_job_id` int DEFAULT NULL,
  `rework_reason` text NOT NULL,
  `original_tech_id` int NOT NULL,
  `raised_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `rework_status` text NOT NULL,
  `raised_at` text NOT NULL,
  `actioned_at` text,
  PRIMARY KEY (`rework_id`),
  KEY `fk_rwl_tech` (`original_tech_id`),
  KEY `fk_rwl_original` (`original_job_id`),
  CONSTRAINT `fk_rwl_original` FOREIGN KEY (`original_job_id`) REFERENCES `job_card_master` (`job_card_id`),
  CONSTRAINT `fk_rwl_tech` FOREIGN KEY (`original_tech_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `rework_tracking`
--
DROP TABLE IF EXISTS `rework_tracking`;
CREATE TABLE `rework_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `original_job_id` int DEFAULT NULL,
  `rework_job_id` int DEFAULT NULL,
  `vehicle_reg` varchar(20) DEFAULT NULL,
  `assigned_technician_id` int DEFAULT NULL,
  `original_closure_date` datetime DEFAULT NULL,
  `rework_date` datetime DEFAULT NULL,
  `days_since_original` int DEFAULT NULL,
  `original_issue` varchar(255) DEFAULT NULL,
  `rework_reason` varchar(255) DEFAULT NULL,
  `rework_completed` tinyint(1) DEFAULT NULL,
  `rework_revenue` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `original_job_id` (`original_job_id`),
  KEY `rework_job_id` (`rework_job_id`),
  KEY `assigned_technician_id` (`assigned_technician_id`),
  CONSTRAINT `rework_tracking_ibfk_1` FOREIGN KEY (`original_job_id`) REFERENCES `backup_legacy_job_cards` (`job_id`),
  CONSTRAINT `rework_tracking_ibfk_2` FOREIGN KEY (`rework_job_id`) REFERENCES `backup_legacy_job_cards` (`job_id`),
  CONSTRAINT `rework_tracking_ibfk_3` FOREIGN KEY (`assigned_technician_id`) REFERENCES `backup_legacy_employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `role_permissions`
--
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `permission_id` int NOT NULL AUTO_INCREMENT,
  `role_id` int DEFAULT NULL,
  `module_id` int DEFAULT NULL,
  `can_view` tinyint(1) DEFAULT '0',
  `can_edit` tinyint(1) DEFAULT '0',
  `can_comment` tinyint(1) DEFAULT '0',
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `can_create` tinyint(1) DEFAULT '0',
  `can_delete` tinyint(1) DEFAULT '0',
  `can_approve` tinyint(1) DEFAULT '0',
  `can_reject` tinyint(1) DEFAULT '0',
  `can_print` tinyint(1) DEFAULT '0',
  `can_export` tinyint(1) DEFAULT '0',
  `can_import` tinyint(1) DEFAULT '0',
  `can_assign` tinyint(1) DEFAULT '0',
  `can_close` tinyint(1) DEFAULT '0',
  `can_reopen` tinyint(1) DEFAULT '0',
  `can_admin` tinyint(1) DEFAULT '0',
  `can_configure` tinyint(1) DEFAULT '0',
  `role_name` varchar(255) DEFAULT NULL,
  `module_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uq_role_module` (`role_id`,`module_id`),
  KEY `fk_role_permissions_module` (`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `roles`
--
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(255) NOT NULL,
  `permission_level` varchar(50) NOT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `rpt_qc_checklists`
--
DROP TABLE IF EXISTS `rpt_qc_checklists`;
CREATE TABLE `rpt_qc_checklists` (
  `qc_checklist_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int DEFAULT NULL,
  `inspector_id` int DEFAULT NULL,
  `result` varchar(50) DEFAULT NULL,
  `check_items_json` text,
  `road_test_km` int DEFAULT NULL,
  `inspector_notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`qc_checklist_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `schema_migrations`
--
DROP TABLE IF EXISTS `schema_migrations`;
CREATE TABLE `schema_migrations` (
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `checksum` varchar(64) DEFAULT NULL,
  `execution_time_ms` int DEFAULT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `security_audit_logs`
--
DROP TABLE IF EXISTS `security_audit_logs`;
CREATE TABLE `security_audit_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `username` varchar(255) NOT NULL,
  `action` varchar(255) NOT NULL,
  `details` text NOT NULL,
  `correlation_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `service_history`
--
DROP TABLE IF EXISTS `service_history`;
CREATE TABLE `service_history` (
  `sh_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chassis_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registration_no` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sr_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_datetime` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `other_service_center` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serviced_at_other_src` tinyint(1) DEFAULT '0',
  `job_card_open_date` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `odometer_reading` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sr_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `summary` text COLLATE utf8mb4_unicode_ci,
  `survey_customer` tinyint(1) DEFAULT '0',
  `revisit` tinyint(1) DEFAULT '0',
  `service_request` text COLLATE utf8mb4_unicode_ci,
  `contact_full_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `account_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`sh_no`),
  KEY `idx_sh_chassis` (`chassis_no`),
  KEY `idx_sh_reg_no` (`registration_no`),
  KEY `idx_sh_sr_no` (`sr_no`),
  KEY `idx_sh_service_date` (`service_datetime`),
  KEY `idx_sh_chassis_date` (`chassis_no`,`service_datetime` DESC),
  CONSTRAINT `fk_sh_chassis` FOREIGN KEY (`chassis_no`) REFERENCES `vehicle_master` (`chassis_no`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for `shifts`
--
DROP TABLE IF EXISTS `shifts`;
CREATE TABLE `shifts` (
  `shift_id` int NOT NULL AUTO_INCREMENT,
  `shift_type` varchar(50) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`shift_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `sold_vehicles`
--
DROP TABLE IF EXISTS `sold_vehicles`;
CREATE TABLE `sold_vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vrn` varchar(50) NOT NULL,
  `vin` varchar(50) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_mobile` varchar(50) NOT NULL,
  `vehicle_make` varchar(100) NOT NULL,
  `vehicle_model` varchar(100) NOT NULL,
  `vehicle_year` int NOT NULL,
  `date_sold` varchar(100) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `warranty_end_date` varchar(100) DEFAULT NULL,
  `warranty_end_km` int DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `vrn` (`vrn`),
  UNIQUE KEY `vin` (`vin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `sr_types`
--
DROP TABLE IF EXISTS `sr_types`;
CREATE TABLE `sr_types` (
  `sr_type_id` int NOT NULL,
  `sr_type_code` text NOT NULL,
  `sr_type_name` text NOT NULL,
  `default_duration_mins` int NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  PRIMARY KEY (`sr_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `staff_feedback`
--
DROP TABLE IF EXISTS `staff_feedback`;
CREATE TABLE `staff_feedback` (
  `feedback_id` varchar(100) NOT NULL,
  `employee_id` int NOT NULL,
  `role` varchar(100) NOT NULL,
  `screen_id` varchar(100) NOT NULL,
  `feedback_type` varchar(50) NOT NULL,
  `message` text NOT NULL,
  `rating` int DEFAULT NULL,
  `screenshot_base64` longtext,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ai_analysis` text,
  `ai_severity` varchar(30) DEFAULT 'MEDIUM',
  `ai_suggested_fix` text,
  `ai_status` varchar(30) DEFAULT 'TRIAGED',
  `device_info` text,
  `ide_agent_prompt` text,
  `in_house_action` text,
  PRIMARY KEY (`feedback_id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `staff_feedback_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `system_settings`
--
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_ai_mode_requests`
--
DROP TABLE IF EXISTS `tbl_ai_mode_requests`;
CREATE TABLE `tbl_ai_mode_requests` (
  `request_id` bigint NOT NULL AUTO_INCREMENT,
  `requested_state` tinyint(1) NOT NULL DEFAULT '1',
  `reason` text,
  `requested_by` int DEFAULT NULL,
  `requested_by_name` varchar(191) DEFAULT NULL,
  `requested_by_role` varchar(64) DEFAULT NULL,
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_by_name` varchar(191) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_notes` text,
  PRIMARY KEY (`request_id`),
  KEY `idx_ai_mode_req_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_attachments`
--
DROP TABLE IF EXISTS `tbl_attachments`;
CREATE TABLE `tbl_attachments` (
  `attachment_id` varchar(50) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `attachment_category` varchar(100) DEFAULT NULL,
  `file_url` text,
  `uploaded_by` varchar(100) DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attachment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_bays`
--
DROP TABLE IF EXISTS `tbl_bays`;
CREATE TABLE `tbl_bays` (
  `bay_id` varchar(20) NOT NULL,
  `bay_name` varchar(100) NOT NULL,
  `bay_type` varchar(50) NOT NULL,
  `lob_suitability` varchar(50) NOT NULL DEFAULT 'ALL',
  `status` varchar(30) NOT NULL DEFAULT 'AVAILABLE',
  `current_job_card_id` varchar(50) DEFAULT NULL,
  `current_vrn` varchar(30) DEFAULT NULL,
  `occupied_since` datetime DEFAULT NULL,
  `branch_id` varchar(50) NOT NULL DEFAULT 'BR-SEDAM',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`bay_id`),
  KEY `idx_bays_branch` (`branch_id`),
  KEY `idx_bays_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_bin_master`
--
DROP TABLE IF EXISTS `tbl_bin_master`;
CREATE TABLE `tbl_bin_master` (
  `bin_id` varchar(50) NOT NULL,
  `bin_code` varchar(50) DEFAULT NULL,
  `warehouse_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`bin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_credit_requests`
--
DROP TABLE IF EXISTS `tbl_credit_requests`;
CREATE TABLE `tbl_credit_requests` (
  `credit_request_id` varchar(50) NOT NULL,
  `job_id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `reason` text NOT NULL,
  `requested_by` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT 'REQUESTED',
  `gm_id` varchar(50) DEFAULT NULL,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `decision_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`credit_request_id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_crm_billing_evidence`
--
DROP TABLE IF EXISTS `tbl_crm_billing_evidence`;
CREATE TABLE `tbl_crm_billing_evidence` (
  `crm_evidence_id` int NOT NULL AUTO_INCREMENT,
  `pre_invoice_id` int NOT NULL,
  `job_id` int NOT NULL,
  `job_card_no` varchar(50) DEFAULT NULL,
  `branch_id` int NOT NULL,
  `crm_invoice_number` varchar(100) NOT NULL,
  `crm_invoice_date` date NOT NULL,
  `crm_invoice_amount` decimal(12,2) NOT NULL,
  `crm_dms_reference` varchar(100) DEFAULT NULL,
  `invoice_pdf_evidence_id` varchar(255) NOT NULL,
  `ocr_suggested_invoice_no` varchar(100) DEFAULT NULL,
  `ocr_suggested_date` date DEFAULT NULL,
  `ocr_suggested_amount` decimal(12,2) DEFAULT NULL,
  `ocr_confidence` int DEFAULT NULL,
  `human_confirmed` tinyint(1) NOT NULL DEFAULT '0',
  `human_confirmed_by` int DEFAULT NULL,
  `human_confirmed_by_name` varchar(100) DEFAULT NULL,
  `human_confirmed_at` datetime DEFAULT NULL,
  `dms_invoices_match_ref` varchar(100) DEFAULT NULL,
  `amount_variance` decimal(12,2) DEFAULT NULL,
  `amount_variance_percent` decimal(5,2) DEFAULT NULL,
  `variance_acknowledged` tinyint(1) NOT NULL DEFAULT '0',
  `source` varchar(50) NOT NULL DEFAULT 'CRM_DMS',
  `status` enum('UPLOADED','VALIDATED','REJECTED') NOT NULL DEFAULT 'UPLOADED',
  `rejection_reason` text,
  `is_retrospective` tinyint(1) NOT NULL DEFAULT '0',
  `manual_gate_pass_ref` int DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `uploaded_by_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`crm_evidence_id`),
  KEY `idx_cbe_pi` (`pre_invoice_id`),
  KEY `idx_cbe_job` (`job_id`),
  KEY `idx_cbe_invoice_no` (`crm_invoice_number`),
  KEY `idx_cbe_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_edit_audit`
--
DROP TABLE IF EXISTS `tbl_edit_audit`;
CREATE TABLE `tbl_edit_audit` (
  `audit_id` varchar(40) NOT NULL,
  `entity_type` varchar(60) NOT NULL,
  `entity_id` varchar(80) DEFAULT NULL,
  `action` varchar(60) DEFAULT NULL,
  `justification` text NOT NULL,
  `before_json` mediumtext,
  `after_json` mediumtext,
  `changed_by` varchar(100) DEFAULT NULL,
  `changed_by_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  KEY `idx_edit_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_edit_audit_when` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_evidence`
--
DROP TABLE IF EXISTS `tbl_evidence`;
CREATE TABLE `tbl_evidence` (
  `evidence_id` varchar(50) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `evidence_type` varchar(50) DEFAULT NULL,
  `storage_path` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `uploaded_by` varchar(50) DEFAULT NULL,
  `lifecycle_status` varchar(50) DEFAULT NULL,
  `is_locked` tinyint(1) DEFAULT '0',
  `workflow_type` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`evidence_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_gate_entry`
--
DROP TABLE IF EXISTS `tbl_gate_entry`;
CREATE TABLE `tbl_gate_entry` (
  `gate_entry_id` varchar(100) NOT NULL,
  `vin` varchar(100) DEFAULT NULL,
  `odometer` int DEFAULT NULL,
  `source` varchar(20) DEFAULT NULL,
  `driver_details` text,
  `initial_remarks` text,
  `status` varchar(50) DEFAULT NULL,
  `arrival_time` datetime DEFAULT NULL,
  PRIMARY KEY (`gate_entry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_gate_in`
--
DROP TABLE IF EXISTS `tbl_gate_in`;
CREATE TABLE `tbl_gate_in` (
  `gate_entry_id` varchar(50) NOT NULL,
  `vrn` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`gate_entry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_gate_out`
--
DROP TABLE IF EXISTS `tbl_gate_out`;
CREATE TABLE `tbl_gate_out` (
  `gate_out_id` varchar(100) NOT NULL,
  `gate_pass_id` varchar(100) DEFAULT NULL,
  `job_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `security_operator_id` varchar(100) DEFAULT NULL,
  `evidence_id` varchar(100) DEFAULT NULL,
  `capture_source` varchar(100) DEFAULT NULL,
  `expected_vrn` varchar(100) DEFAULT NULL,
  `detected_vrn` varchar(100) DEFAULT NULL,
  `verification_result` varchar(50) DEFAULT NULL,
  `gate_out_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `vrn` varchar(50) DEFAULT NULL,
  `verified_by` varchar(100) DEFAULT NULL,
  `remarks` text,
  PRIMARY KEY (`gate_out_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_gate_pass`
--
DROP TABLE IF EXISTS `tbl_gate_pass`;
CREATE TABLE `tbl_gate_pass` (
  `gate_pass_id` varchar(100) NOT NULL,
  `job_id` int DEFAULT NULL,
  `gate_pass_no` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `release_basis` varchar(100) DEFAULT NULL,
  `payment_id` varchar(100) DEFAULT NULL,
  `credit_request_id` varchar(100) DEFAULT NULL,
  `manual_gate_pass_request_id` varchar(100) DEFAULT NULL,
  `is_manual_exception` tinyint(1) DEFAULT '0',
  `issued_by` varchar(100) DEFAULT NULL,
  `issued_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `generated_by` varchar(100) DEFAULT NULL,
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_by` varchar(100) DEFAULT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `revoke_reason` text,
  `vrn` varchar(50) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `vehicle_model` varchar(255) DEFAULT NULL,
  `payment_mode` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `reference_number` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`gate_pass_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_gate_reentry_requests`
--
DROP TABLE IF EXISTS `tbl_gate_reentry_requests`;
CREATE TABLE `tbl_gate_reentry_requests` (
  `request_id` bigint NOT NULL AUTO_INCREMENT,
  `vrn` varchar(50) DEFAULT NULL,
  `chassis_number` varchar(50) DEFAULT NULL,
  `prior_job_id` int NOT NULL,
  `prior_job_card_no` varchar(64) NOT NULL,
  `payload_json` text NOT NULL,
  `requested_by` int DEFAULT NULL,
  `requested_by_name` varchar(191) DEFAULT NULL,
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_by_name` varchar(191) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_notes` text,
  `created_job_id` int DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `idx_reentry_status` (`status`),
  KEY `idx_reentry_prior_job` (`prior_job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_goods_issue`
--
DROP TABLE IF EXISTS `tbl_goods_issue`;
CREATE TABLE `tbl_goods_issue` (
  `issue_number` varchar(50) NOT NULL,
  `job_card_id` varchar(50) DEFAULT NULL,
  `part_number` varchar(100) NOT NULL,
  `issued_quantity` decimal(12,2) DEFAULT NULL,
  `warehouse_id` varchar(50) DEFAULT NULL,
  `bin_id` varchar(50) DEFAULT NULL,
  `technician_id` varchar(50) DEFAULT NULL,
  `issued_by` varchar(100) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `issue_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`issue_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_grievances`
--
DROP TABLE IF EXISTS `tbl_grievances`;
CREATE TABLE `tbl_grievances` (
  `grievance_id` varchar(50) NOT NULL,
  `employee_id` int NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'OPEN',
  `filed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_by` varchar(100) DEFAULT NULL,
  `resolution_notes` text,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`grievance_id`),
  KEY `idx_grievance_employee` (`employee_id`),
  KEY `idx_grievance_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_handoff_sla`
--
DROP TABLE IF EXISTS `tbl_handoff_sla`;
CREATE TABLE `tbl_handoff_sla` (
  `sla_id` int NOT NULL AUTO_INCREMENT,
  `entity_id` varchar(100) DEFAULT NULL,
  `stage_name` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'PENDING',
  `accepted_at` timestamp NULL DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `eod_deadline` datetime DEFAULT NULL,
  `target_sla_minutes` int DEFAULT NULL,
  `escalation_level` int DEFAULT '0',
  `escalated_at` timestamp NULL DEFAULT NULL,
  `handoff_id` varchar(50) DEFAULT NULL,
  `owner_role` varchar(50) DEFAULT NULL,
  `owner_id` varchar(50) DEFAULT NULL,
  `sla_due_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sla_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_holidays`
--
DROP TABLE IF EXISTS `tbl_holidays`;
CREATE TABLE `tbl_holidays` (
  `holiday_id` int NOT NULL AUTO_INCREMENT,
  `holiday_date` date NOT NULL,
  `name` varchar(150) NOT NULL,
  `is_optional` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`holiday_id`),
  UNIQUE KEY `uq_holiday_date_name` (`holiday_date`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_inventory_stock`
--
DROP TABLE IF EXISTS `tbl_inventory_stock`;
CREATE TABLE `tbl_inventory_stock` (
  `stock_id` int NOT NULL AUTO_INCREMENT,
  `part_number` varchar(100) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `warehouse_id` varchar(50) NOT NULL,
  `bin_id` varchar(50) DEFAULT NULL,
  `available_quantity` decimal(12,2) DEFAULT '0.00',
  `reserved_quantity` decimal(12,2) DEFAULT '0.00',
  `current_quantity` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`stock_id`),
  UNIQUE KEY `unique_stock` (`part_number`,`branch_id`,`warehouse_id`,`bin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_invoice`
--
DROP TABLE IF EXISTS `tbl_invoice`;
CREATE TABLE `tbl_invoice` (
  `pre_invoice_id` varchar(100) NOT NULL,
  `job_id` varchar(100) DEFAULT NULL,
  `invoice_no` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`pre_invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_job_allocations`
--
DROP TABLE IF EXISTS `tbl_job_allocations`;
CREATE TABLE `tbl_job_allocations` (
  `allocation_id` varchar(50) NOT NULL,
  `job_card_id` varchar(50) NOT NULL,
  `bay_id` varchar(20) NOT NULL,
  `technician_id` varchar(50) NOT NULL,
  `technician_name` varchar(100) NOT NULL,
  `allocated_by` varchar(100) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `is_override` tinyint(1) NOT NULL DEFAULT '0',
  `override_reason` text,
  `branch_id` varchar(50) NOT NULL DEFAULT 'BR-SEDAM',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`allocation_id`),
  KEY `idx_alloc_job` (`job_card_id`),
  KEY `idx_alloc_bay` (`bay_id`),
  KEY `idx_alloc_tech` (`technician_id`),
  KEY `idx_alloc_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_job_complaints`
--
DROP TABLE IF EXISTS `tbl_job_complaints`;
CREATE TABLE `tbl_job_complaints` (
  `complaint_id` varchar(40) NOT NULL,
  `job_card_no` varchar(50) DEFAULT NULL,
  `job_id` int DEFAULT NULL,
  `vrn` varchar(30) DEFAULT NULL,
  `gate_entry_id` varchar(50) DEFAULT NULL,
  `intake_id` varchar(50) DEFAULT NULL,
  `source` varchar(40) DEFAULT NULL,
  `category` varchar(60) DEFAULT NULL,
  `complaint_text` text NOT NULL,
  `symptom` varchar(255) DEFAULT NULL,
  `when_occurs` varchar(120) DEFAULT NULL,
  `is_repeat` tinyint(1) DEFAULT '0',
  `is_immobilized` tinyint(1) DEFAULT '0',
  `is_safety_critical` tinyint(1) DEFAULT '0',
  `status` varchar(30) DEFAULT 'OPEN',
  `authored_by` varchar(100) DEFAULT NULL,
  `authored_by_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`complaint_id`),
  KEY `idx_jc_complaints_vrn` (`vrn`),
  KEY `idx_jc_complaints_job` (`job_card_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_leave_requests`
--
DROP TABLE IF EXISTS `tbl_leave_requests`;
CREATE TABLE `tbl_leave_requests` (
  `leave_id` varchar(50) NOT NULL,
  `employee_id` int NOT NULL,
  `leave_type` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` text,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `approved_by` varchar(100) DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`leave_id`),
  KEY `idx_leave_employee` (`employee_id`),
  KEY `idx_leave_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_manager_assignment`
--
DROP TABLE IF EXISTS `tbl_manager_assignment`;
CREATE TABLE `tbl_manager_assignment` (
  `assignment_id` varchar(100) NOT NULL,
  `intake_id` varchar(100) DEFAULT NULL,
  `gate_entry_id` varchar(100) DEFAULT NULL,
  `vos_id` varchar(100) DEFAULT NULL,
  `assigned_sa_id` varchar(100) DEFAULT NULL,
  `assigned_sa_name` varchar(100) DEFAULT NULL,
  `assigning_manager_id` varchar(100) DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT NULL,
  `recommendation_sa_id` varchar(100) DEFAULT NULL,
  `recommendation_reason` varchar(255) DEFAULT NULL,
  `is_override` tinyint(1) DEFAULT NULL,
  `override_reason` varchar(255) DEFAULT NULL,
  `branch_id` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`assignment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_manager_overrides`
--
DROP TABLE IF EXISTS `tbl_manager_overrides`;
CREATE TABLE `tbl_manager_overrides` (
  `override_id` int NOT NULL AUTO_INCREMENT,
  `job_id` varchar(100) DEFAULT NULL,
  `target_stage` varchar(100) DEFAULT NULL,
  `reason` text,
  `manager_id` varchar(100) DEFAULT NULL,
  `branch_id` varchar(100) DEFAULT NULL,
  `override_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`override_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_manual_gate_pass_request`
--
DROP TABLE IF EXISTS `tbl_manual_gate_pass_request`;
CREATE TABLE `tbl_manual_gate_pass_request` (
  `mgp_id` varchar(100) NOT NULL,
  `job_id` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`mgp_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_parts_master`
--
DROP TABLE IF EXISTS `tbl_parts_master`;
CREATE TABLE `tbl_parts_master` (
  `part_id` int NOT NULL AUTO_INCREMENT,
  `part_number` varchar(100) NOT NULL,
  `part_description` text,
  `hsn_code` varchar(50) DEFAULT NULL,
  `part_category` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`part_id`),
  UNIQUE KEY `part_number` (`part_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_parts_requests`
--
DROP TABLE IF EXISTS `tbl_parts_requests`;
CREATE TABLE `tbl_parts_requests` (
  `request_id` varchar(50) NOT NULL,
  `job_card_id` varchar(50) NOT NULL,
  `vrn` varchar(50) NOT NULL,
  `operation_id` varchar(50) DEFAULT NULL,
  `part_code` varchar(100) DEFAULT NULL,
  `part_description` text NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `urgency` varchar(50) DEFAULT 'NORMAL',
  `requested_by` varchar(100) NOT NULL,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) DEFAULT 'PENDING',
  `parts_user_response` text,
  `responded_at` timestamp NULL DEFAULT NULL,
  `acknowledged_by` varchar(100) DEFAULT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `fulfilled_by` varchar(100) DEFAULT NULL,
  `fulfilled_at` timestamp NULL DEFAULT NULL,
  `stock_reservation_id` varchar(50) DEFAULT NULL,
  `goods_issue_id` varchar(50) DEFAULT NULL,
  `rejection_reason` text,
  `expected_date` timestamp NULL DEFAULT NULL,
  `branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_payments`
--
DROP TABLE IF EXISTS `tbl_payments`;
CREATE TABLE `tbl_payments` (
  `payment_id` varchar(50) NOT NULL,
  `job_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `payment_mode` varchar(50) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `cashier_id` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'COMPLETED',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_pre_invoice`
--
DROP TABLE IF EXISTS `tbl_pre_invoice`;
CREATE TABLE `tbl_pre_invoice` (
  `pre_invoice_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `job_card_no` varchar(50) NOT NULL,
  `branch_id` int NOT NULL,
  `vrn` varchar(30) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `service_advisor_id` int DEFAULT NULL,
  `service_advisor_name` varchar(100) DEFAULT NULL,
  `current_version` int NOT NULL DEFAULT '1',
  `status` enum('DRAFT','DISCOUNT_PENDING','SA_REVIEWED','SENT_TO_CUSTOMER','CUSTOMER_CONFIRMED','BILLING_HANDED_OFF','RETURNED_TO_SA','BILLING_IN_PROGRESS','BILLING_COMPLETED') NOT NULL DEFAULT 'DRAFT',
  `return_reason_code` varchar(50) DEFAULT NULL,
  `return_remarks` text,
  `returned_by` int DEFAULT NULL,
  `returned_by_name` varchar(100) DEFAULT NULL,
  `returned_at` datetime DEFAULT NULL,
  `billing_acknowledged_by` int DEFAULT NULL,
  `billing_acknowledged_at` datetime DEFAULT NULL,
  `billing_validated_at` datetime DEFAULT NULL,
  `invoice_posting_status` enum('NOT_APPLICABLE','DRAFT','POSTED','PENDING_ACCOUNTING') NOT NULL DEFAULT 'NOT_APPLICABLE',
  `crm_evidence_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pre_invoice_id`),
  KEY `idx_pi_job` (`job_id`),
  KEY `idx_pi_branch` (`branch_id`),
  KEY `idx_pi_status` (`status`),
  KEY `idx_pi_sa` (`service_advisor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_pre_invoice_confirmation`
--
DROP TABLE IF EXISTS `tbl_pre_invoice_confirmation`;
CREATE TABLE `tbl_pre_invoice_confirmation` (
  `confirmation_id` int NOT NULL AUTO_INCREMENT,
  `pre_invoice_id` int NOT NULL,
  `pre_invoice_version` int NOT NULL,
  `confirmation_type` enum('VERBAL_SA_RECORDED','WHATSAPP','SMS','SIGNED_HARDCOPY','VOICE_RECORDING','MANAGER_RECORDED','DIGITAL_APPROVAL') NOT NULL,
  `confirmed_by_name` varchar(150) NOT NULL,
  `confirmed_by_contact` varchar(100) DEFAULT NULL,
  `captured_by_id` int NOT NULL,
  `captured_by_name` varchar(100) DEFAULT NULL,
  `confirmed_at` datetime NOT NULL,
  `evidence_ref` varchar(255) DEFAULT NULL,
  `digital_approval_ref` varchar(100) DEFAULT NULL,
  `remarks` text,
  `grand_total_confirmed` decimal(12,2) NOT NULL,
  `is_superseded` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`confirmation_id`),
  KEY `idx_pic_pi` (`pre_invoice_id`),
  KEY `idx_pic_version` (`pre_invoice_id`,`pre_invoice_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_pre_invoice_version`
--
DROP TABLE IF EXISTS `tbl_pre_invoice_version`;
CREATE TABLE `tbl_pre_invoice_version` (
  `piv_id` int NOT NULL AUTO_INCREMENT,
  `pre_invoice_id` int NOT NULL,
  `version` int NOT NULL,
  `previous_version_id` int DEFAULT NULL,
  `compiled_by` int NOT NULL,
  `compiled_by_name` varchar(100) DEFAULT NULL,
  `compiled_at` datetime NOT NULL,
  `change_reason` varchar(255) DEFAULT NULL,
  `labour_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `parts_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `requested_discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `authorized_discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_status` enum('NOT_REQUESTED','APPROVED_AUTO','APPROVED_MANUAL','PENDING_AUTHORIZATION') NOT NULL DEFAULT 'NOT_REQUESTED',
  `discount_approval_ref` varchar(100) DEFAULT NULL,
  `taxable_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gst_rate` decimal(5,2) NOT NULL DEFAULT '18.00',
  `gst_source` varchar(50) NOT NULL DEFAULT 'CONFIG_DEFAULT',
  `cgst` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sgst` decimal(12,2) NOT NULL DEFAULT '0.00',
  `igst` decimal(12,2) NOT NULL DEFAULT '0.00',
  `grand_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `lines_snapshot_json` json DEFAULT NULL,
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`piv_id`),
  UNIQUE KEY `uk_piv_version` (`pre_invoice_id`,`version`),
  KEY `idx_piv_pi` (`pre_invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_qc_handoff`
--
DROP TABLE IF EXISTS `tbl_qc_handoff`;
CREATE TABLE `tbl_qc_handoff` (
  `handoff_id` varchar(50) NOT NULL,
  `job_card_id` varchar(50) NOT NULL,
  `vrn` varchar(30) NOT NULL,
  `floor_incharge_id` varchar(50) NOT NULL,
  `qc_incharge_id` varchar(50) NOT NULL,
  `validation_status` varchar(30) NOT NULL DEFAULT 'PASSED',
  `status` varchar(30) NOT NULL DEFAULT 'PENDING_QC',
  `branch_id` varchar(50) NOT NULL DEFAULT 'BR-SEDAM',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`handoff_id`),
  KEY `idx_qch_job` (`job_card_id`),
  KEY `idx_qch_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_qc_reviews`
--
DROP TABLE IF EXISTS `tbl_qc_reviews`;
CREATE TABLE `tbl_qc_reviews` (
  `review_id` varchar(50) NOT NULL,
  `job_id` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_reception_intake`
--
DROP TABLE IF EXISTS `tbl_reception_intake`;
CREATE TABLE `tbl_reception_intake` (
  `intake_id` varchar(100) NOT NULL,
  `gate_entry_id` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `vos_id` varchar(100) DEFAULT NULL,
  `token_number` varchar(50) DEFAULT NULL,
  `accepted_by` varchar(255) DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `original_odometer` int DEFAULT NULL,
  `confirmed_odometer` int DEFAULT NULL,
  `odometer_corrected` tinyint(1) DEFAULT NULL,
  `correction_reason` varchar(255) DEFAULT NULL,
  `visit_category` varchar(100) DEFAULT NULL,
  `preliminary_complaints` text,
  `branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`intake_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_repair_executions`
--
DROP TABLE IF EXISTS `tbl_repair_executions`;
CREATE TABLE `tbl_repair_executions` (
  `execution_id` varchar(50) NOT NULL,
  `job_card_id` varchar(50) NOT NULL,
  `operation_id` varchar(50) DEFAULT NULL,
  `operation_name` varchar(255) DEFAULT NULL,
  `technician_id` varchar(50) NOT NULL,
  `technician_name` varchar(100) DEFAULT NULL,
  `bay_id` varchar(20) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'NOT_STARTED',
  `planned_duration_mins` int DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `paused_at` datetime DEFAULT NULL,
  `accumulated_productive_seconds` int NOT NULL DEFAULT '0',
  `accumulated_paused_seconds` int NOT NULL DEFAULT '0',
  `pause_reason` text,
  `completed_at` datetime DEFAULT NULL,
  `branch_id` varchar(50) NOT NULL DEFAULT 'BR-SEDAM',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`execution_id`),
  KEY `idx_exec_job` (`job_card_id`),
  KEY `idx_exec_tech` (`technician_id`),
  KEY `idx_exec_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_sa_intake`
--
DROP TABLE IF EXISTS `tbl_sa_intake`;
CREATE TABLE `tbl_sa_intake` (
  `intake_id` varchar(50) NOT NULL,
  `vrn` varchar(50) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `job_card_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `gate_entry_id` varchar(50) DEFAULT NULL,
  `vos_id` varchar(50) DEFAULT NULL,
  `sa_id` varchar(50) DEFAULT NULL,
  `sa_name` varchar(100) DEFAULT NULL,
  `gate_odometer` int DEFAULT NULL,
  `reception_odometer` int DEFAULT NULL,
  `sa_verified_odometer` int DEFAULT NULL,
  `odometer_corrected` tinyint(1) NOT NULL DEFAULT '0',
  `correction_reason` text,
  `complaint_source` varchar(100) DEFAULT NULL,
  `authenticated_by` varchar(100) DEFAULT NULL,
  `authenticated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `authenticated_complaints_json` text,
  `fsv_status` varchar(50) DEFAULT 'DATA_UNAVAILABLE',
  `warranty_prescreen_status` varchar(50) DEFAULT 'INSUFFICIENT_DATA',
  `job_scope_json` text,
  `jc_type` varchar(50) NOT NULL DEFAULT 'DWIP_TEMP',
  `reconciled_crm_jc_no` varchar(50) DEFAULT NULL,
  `reconciled_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`intake_id`),
  KEY `idx_sa_intake_ge` (`gate_entry_id`),
  KEY `idx_sa_intake_jc` (`job_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_sla_history`
--
DROP TABLE IF EXISTS `tbl_sla_history`;
CREATE TABLE `tbl_sla_history` (
  `history_id` varchar(50) NOT NULL,
  `instance_id` varchar(50) DEFAULT NULL,
  `action` varchar(50) DEFAULT NULL,
  `details` text,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_stock_reservation`
--
DROP TABLE IF EXISTS `tbl_stock_reservation`;
CREATE TABLE `tbl_stock_reservation` (
  `reservation_number` varchar(50) NOT NULL,
  `job_card_id` varchar(50) DEFAULT NULL,
  `part_number` varchar(100) NOT NULL,
  `reserved_quantity` decimal(12,2) DEFAULT NULL,
  `issued_quantity` decimal(12,2) DEFAULT '0.00',
  `released_quantity` decimal(12,2) DEFAULT '0.00',
  `status` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`reservation_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_stock_transaction`
--
DROP TABLE IF EXISTS `tbl_stock_transaction`;
CREATE TABLE `tbl_stock_transaction` (
  `transaction_id` varchar(50) NOT NULL,
  `transaction_type` varchar(50) DEFAULT NULL,
  `part_number` varchar(100) NOT NULL,
  `warehouse_id` varchar(50) DEFAULT NULL,
  `bin_id` varchar(50) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` varchar(50) DEFAULT NULL,
  `quantity` decimal(12,2) DEFAULT NULL,
  `unit_cost` decimal(12,2) DEFAULT NULL,
  `running_balance` decimal(12,2) DEFAULT NULL,
  `transaction_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `performed_by` varchar(50) DEFAULT NULL,
  `reason` text,
  `from_bin_id` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_task_claims`
--
DROP TABLE IF EXISTS `tbl_task_claims`;
CREATE TABLE `tbl_task_claims` (
  `claim_id` varchar(100) NOT NULL,
  `job_id` varchar(100) DEFAULT NULL,
  `task_type` varchar(50) DEFAULT NULL,
  `owner_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`claim_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_training_records`
--
DROP TABLE IF EXISTS `tbl_training_records`;
CREATE TABLE `tbl_training_records` (
  `record_id` varchar(50) NOT NULL,
  `employee_id` int NOT NULL,
  `course_name` varchar(200) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'NOT_STARTED',
  `completed_date` date DEFAULT NULL,
  `certificate_ref` varchar(150) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`record_id`),
  KEY `idx_training_employee` (`employee_id`),
  KEY `idx_training_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_warehouse_master`
--
DROP TABLE IF EXISTS `tbl_warehouse_master`;
CREATE TABLE `tbl_warehouse_master` (
  `warehouse_id` varchar(50) NOT NULL,
  `warehouse_name` varchar(100) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_warranty_claims`
--
DROP TABLE IF EXISTS `tbl_warranty_claims`;
CREATE TABLE `tbl_warranty_claims` (
  `claim_id` varchar(50) NOT NULL,
  `job_id` int DEFAULT '0',
  `vin` varchar(50) DEFAULT NULL,
  `operation_type` varchar(50) DEFAULT NULL,
  `workflow_state` varchar(50) DEFAULT 'CLAIM_CREATED',
  `total_claimed_amount` decimal(10,2) DEFAULT NULL,
  `total_approved_amount` decimal(10,2) DEFAULT NULL,
  `oem_claim_reference` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`claim_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_warranty_reviews`
--
DROP TABLE IF EXISTS `tbl_warranty_reviews`;
CREATE TABLE `tbl_warranty_reviews` (
  `review_id` varchar(50) NOT NULL,
  `job_card_id` varchar(50) NOT NULL,
  `vrn` varchar(50) NOT NULL,
  `vin` varchar(50) DEFAULT NULL,
  `complaint` text NOT NULL,
  `diagnosis` text,
  `failed_part` varchar(100) DEFAULT NULL,
  `requested_by` varchar(100) NOT NULL,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) DEFAULT 'PENDING',
  `acknowledged_by` varchar(100) DEFAULT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `eligibility_check_result` varchar(50) DEFAULT NULL,
  `document_gaps_json` text,
  `warranty_claim_id` varchar(50) DEFAULT NULL,
  `rejection_reason` text,
  `adjudicated_by` varchar(100) DEFAULT NULL,
  `adjudicated_at` timestamp NULL DEFAULT NULL,
  `adjudication_notes` text,
  `branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`review_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `tbl_workflow_history`
--
DROP TABLE IF EXISTS `tbl_workflow_history`;
CREATE TABLE `tbl_workflow_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int unsigned NOT NULL,
  `old_state` text,
  `new_state` text NOT NULL,
  `queue` text,
  `sla_status` text,
  `etd` timestamp NULL DEFAULT NULL,
  `transition_by` int DEFAULT NULL,
  `transition_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `duration` int DEFAULT NULL,
  `reason` text,
  `event_id` varchar(100) DEFAULT NULL,
  `correlation_id` varchar(100) DEFAULT NULL,
  `parent_event_id` varchar(100) DEFAULT NULL,
  `sequence_number` int DEFAULT NULL,
  `source_system` varchar(100) DEFAULT NULL,
  `event_version` varchar(10) DEFAULT NULL,
  `event_status` varchar(50) DEFAULT NULL,
  `event_category` varchar(50) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `event_type` varchar(100) DEFAULT NULL,
  `user` varchar(100) DEFAULT NULL,
  `role` varchar(100) DEFAULT NULL,
  `workshop_id` int DEFAULT NULL,
  `payload` text,
  PRIMARY KEY (`history_id`),
  KEY `idx_twh_job_time` (`job_id`,`transition_time`),
  CONSTRAINT `fk_twh_job` FOREIGN KEY (`job_id`) REFERENCES `job_card_master` (`job_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `technician_kpi_daily`
--
DROP TABLE IF EXISTS `technician_kpi_daily`;
CREATE TABLE `technician_kpi_daily` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `kpi_date` varchar(50) DEFAULT NULL,
  `jobs_assigned` int DEFAULT NULL,
  `jobs_completed` int DEFAULT NULL,
  `jobs_open` int DEFAULT NULL,
  `revenue_earned` decimal(10,2) DEFAULT NULL,
  `avg_job_duration` int DEFAULT NULL,
  `completion_efficiency` decimal(5,2) DEFAULT NULL,
  `utilization_percent` decimal(5,2) DEFAULT NULL,
  `rework_count` int DEFAULT NULL,
  `rework_percent` decimal(5,2) DEFAULT NULL,
  `tml_claims` int DEFAULT NULL,
  `tml_claim_rate` decimal(5,2) DEFAULT NULL,
  `avg_revenue_per_job` decimal(10,2) DEFAULT NULL,
  `on_time_completion` decimal(5,2) DEFAULT NULL,
  `quality_score` decimal(5,2) DEFAULT NULL,
  `idle_time` int DEFAULT NULL,
  `break_time` int DEFAULT NULL,
  `overtime_hours` decimal(5,2) DEFAULT NULL,
  `health_status` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `technician_kpi_daily_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `backup_legacy_employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `technician_productivity`
--
DROP TABLE IF EXISTS `technician_productivity`;
CREATE TABLE `technician_productivity` (
  `prod_id` int unsigned NOT NULL AUTO_INCREMENT,
  `technician_id` int unsigned NOT NULL,
  `month_year` varchar(10) NOT NULL,
  `total_jobs` int DEFAULT '0',
  `total_hours` decimal(8,2) DEFAULT '0.00',
  `total_revenue` decimal(10,2) DEFAULT '0.00',
  `efficiency_score` decimal(5,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`prod_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `user_access_master`
--
DROP TABLE IF EXISTS `user_access_master`;
CREATE TABLE `user_access_master` (
  `user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `user_role` varchar(30) NOT NULL,
  `access_level` varchar(20) DEFAULT 'read',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `mobile_no` varchar(10) NOT NULL DEFAULT '',
  `password_hash` varchar(255) DEFAULT NULL,
  `otp_hash` varchar(255) DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0',
  `crm_id` varchar(30) DEFAULT NULL,
  `workshop_id` int DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `idx_uam_employee_id` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `user_delegations`
--
DROP TABLE IF EXISTS `user_delegations`;
CREATE TABLE `user_delegations` (
  `delegation_id` int NOT NULL AUTO_INCREMENT,
  `delegator_id` int NOT NULL,
  `delegatee_id` int NOT NULL,
  `module_id` int NOT NULL,
  `effective_from` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `effective_until` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`delegation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `user_onboarding_progress`
--
DROP TABLE IF EXISTS `user_onboarding_progress`;
CREATE TABLE `user_onboarding_progress` (
  `progress_id` varchar(100) NOT NULL,
  `employee_id` int NOT NULL,
  `role` varchar(100) NOT NULL,
  `tour_completed` tinyint(1) DEFAULT '0',
  `completion_percentage` int DEFAULT '0',
  `checklist_json` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`progress_id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `user_onboarding_progress_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `user_overrides`
--
DROP TABLE IF EXISTS `user_overrides`;
CREATE TABLE `user_overrides` (
  `override_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `module_id` int NOT NULL,
  `permission_type` varchar(50) NOT NULL,
  `is_allowed` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`override_id`),
  UNIQUE KEY `uk_user_module_perm` (`user_id`,`module_id`,`permission_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `users`
--
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(100) NOT NULL DEFAULT 'reception',
  `employee_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `password_plain` varchar(255) DEFAULT NULL,
  `date_of_joining` varchar(50) DEFAULT NULL,
  `dob` varchar(50) DEFAULT NULL,
  `qualification` varchar(100) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `grade` varchar(50) DEFAULT NULL,
  `floor_team` varchar(100) DEFAULT NULL,
  `clerical_team` varchar(100) DEFAULT NULL,
  `emp_id` varchar(50) DEFAULT NULL,
  `aadhaar_no` varchar(20) DEFAULT NULL,
  `mobile_no` varchar(20) DEFAULT NULL,
  `role_id` int DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_users_role` (`role_id`),
  KEY `idx_users_employee_id` (`employee_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `vehicle_accidents`
--
DROP TABLE IF EXISTS `vehicle_accidents`;
CREATE TABLE `vehicle_accidents` (
  `accident_id` varchar(255) NOT NULL,
  `passport_id` varchar(255) NOT NULL,
  `event_id` varchar(255) NOT NULL,
  `severity` varchar(50) NOT NULL,
  `description` text,
  `insurance_claim_no` varchar(255) DEFAULT NULL,
  `claim_status` varchar(100) DEFAULT NULL,
  `claim_amount` decimal(12,2) DEFAULT '0.00',
  `verification_level` int DEFAULT '1',
  `accident_date` timestamp NOT NULL,
  PRIMARY KEY (`accident_id`),
  KEY `passport_id` (`passport_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `vehicle_accidents_ibfk_1` FOREIGN KEY (`passport_id`) REFERENCES `vehicle_passports` (`passport_id`) ON DELETE CASCADE,
  CONSTRAINT `vehicle_accidents_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `vehicle_events` (`event_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `vehicle_certificates`
--
DROP TABLE IF EXISTS `vehicle_certificates`;
CREATE TABLE `vehicle_certificates` (
  `certificate_id` varchar(255) NOT NULL,
  `passport_id` varchar(255) NOT NULL,
  `certificate_type` varchar(100) NOT NULL,
  `certificate_status` varchar(50) DEFAULT 'VALID',
  `qr_code` varchar(255) NOT NULL,
  `digital_signature` text NOT NULL,
  `certificate_hash` varchar(255) NOT NULL,
  `health_snapshot` json NOT NULL,
  `trust_snapshot` json NOT NULL,
  `passport_score_at_generation` decimal(5,2) NOT NULL,
  `generated_by` varchar(255) NOT NULL,
  `tier` varchar(50) DEFAULT 'FREE',
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `view_specific_data` json DEFAULT NULL,
  PRIMARY KEY (`certificate_id`),
  UNIQUE KEY `qr_code` (`qr_code`),
  UNIQUE KEY `certificate_hash` (`certificate_hash`),
  KEY `passport_id` (`passport_id`),
  CONSTRAINT `vehicle_certificates_ibfk_1` FOREIGN KEY (`passport_id`) REFERENCES `vehicle_passports` (`passport_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `vehicle_documents`
--
DROP TABLE IF EXISTS `vehicle_documents`;
CREATE TABLE `vehicle_documents` (
  `document_id` varchar(255) NOT NULL,
  `passport_id` varchar(255) NOT NULL,
  `event_id` varchar(255) DEFAULT NULL,
  `document_type` varchar(100) NOT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `verification_status` varchar(50) DEFAULT 'PENDING',
  `ocr_score` decimal(5,2) DEFAULT '0.00',
  `authenticity_score` decimal(5,2) DEFAULT '0.00',
  `tampering_score` decimal(5,2) DEFAULT '0.00',
  `ai_confidence` decimal(5,2) DEFAULT '0.00',
  `verification_level` int DEFAULT '1',
  `storage_reference` text,
  `document_hash` varchar(255) NOT NULL,
  `extracted_fields` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`document_id`),
  KEY `passport_id` (`passport_id`),
  CONSTRAINT `vehicle_documents_ibfk_1` FOREIGN KEY (`passport_id`) REFERENCES `vehicle_passports` (`passport_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `vehicle_events`
--
DROP TABLE IF EXISTS `vehicle_events`;
CREATE TABLE `vehicle_events` (
  `event_id` varchar(255) NOT NULL,
  `passport_id` varchar(255) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `event_source` varchar(50) NOT NULL,
  `event_date` timestamp NOT NULL,
  `odometer_km` int DEFAULT '0',
  `description` text,
  `verification_level` int DEFAULT '1',
  `verified_by` varchar(255) DEFAULT NULL,
  `dealer_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `ai_analysis` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  KEY `passport_id` (`passport_id`),
  CONSTRAINT `vehicle_events_ibfk_1` FOREIGN KEY (`passport_id`) REFERENCES `vehicle_passports` (`passport_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `vehicle_master`
--
DROP TABLE IF EXISTS `vehicle_master`;
CREATE TABLE `vehicle_master` (
  `chassis_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registration_no` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booking_ref_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `engine_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_vc` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_line` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_account_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_account_site` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tm_invoice_date` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `original_sale_date` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `next_service_date` date DEFAULT NULL,
  `next_service_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `physical_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `selling_dealer` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_loss_vehicle` tinyint(1) DEFAULT '0',
  `warranty_expiry_date` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warranty_expiry_hours` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warranty_expiry_km` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_authorization` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chassis_color` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_registration` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_commissioning` date DEFAULT NULL,
  `rc_attached` tinyint(1) DEFAULT '0',
  `hsn_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gst_invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commercial_invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `chassis_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`chassis_no`),
  UNIQUE KEY `idx_vm_reg_no` (`registration_no`),
  KEY `idx_vm_warranty_composite` (`warranty_expiry_date`,`chassis_no`,`registration_no`,`status`),
  KEY `idx_vm_next_service` (`next_service_date`,`next_service_type`),
  KEY `idx_vm_owner_account` (`owner_account_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for `vehicle_modifications`
--
DROP TABLE IF EXISTS `vehicle_modifications`;
CREATE TABLE `vehicle_modifications` (
  `modification_id` varchar(255) NOT NULL,
  `passport_id` varchar(255) NOT NULL,
  `event_id` varchar(255) NOT NULL,
  `modification_type` varchar(100) NOT NULL,
  `description` text,
  `vendor` varchar(255) DEFAULT NULL,
  `cost` decimal(12,2) DEFAULT '0.00',
  `verification_level` int DEFAULT '1',
  `modification_date` timestamp NOT NULL,
  PRIMARY KEY (`modification_id`),
  KEY `passport_id` (`passport_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `vehicle_modifications_ibfk_1` FOREIGN KEY (`passport_id`) REFERENCES `vehicle_passports` (`passport_id`) ON DELETE CASCADE,
  CONSTRAINT `vehicle_modifications_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `vehicle_events` (`event_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `vehicle_ownership_history`
--
DROP TABLE IF EXISTS `vehicle_ownership_history`;
CREATE TABLE `vehicle_ownership_history` (
  `ownership_id` varchar(255) NOT NULL,
  `passport_id` varchar(255) NOT NULL,
  `owner_name` varchar(255) NOT NULL,
  `owner_type` varchar(50) NOT NULL,
  `contact` varchar(255) DEFAULT NULL,
  `ownership_start` timestamp NOT NULL,
  `ownership_end` timestamp NULL DEFAULT NULL,
  `transfer_method` varchar(100) DEFAULT NULL,
  `verification_level` int DEFAULT '1',
  PRIMARY KEY (`ownership_id`),
  KEY `passport_id` (`passport_id`),
  CONSTRAINT `vehicle_ownership_history_ibfk_1` FOREIGN KEY (`passport_id`) REFERENCES `vehicle_passports` (`passport_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `vehicle_parts_history`
--
DROP TABLE IF EXISTS `vehicle_parts_history`;
CREATE TABLE `vehicle_parts_history` (
  `part_id` varchar(255) NOT NULL,
  `passport_id` varchar(255) NOT NULL,
  `event_id` varchar(255) NOT NULL,
  `part_name` varchar(255) NOT NULL,
  `part_number` varchar(100) DEFAULT NULL,
  `part_type` varchar(100) DEFAULT NULL,
  `brand` varchar(255) DEFAULT NULL,
  `cost` decimal(12,2) DEFAULT '0.00',
  `warranty_months` int DEFAULT '0',
  `verification_level` int DEFAULT '1',
  `installed_date` timestamp NOT NULL,
  PRIMARY KEY (`part_id`),
  KEY `passport_id` (`passport_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `vehicle_parts_history_ibfk_1` FOREIGN KEY (`passport_id`) REFERENCES `vehicle_passports` (`passport_id`) ON DELETE CASCADE,
  CONSTRAINT `vehicle_parts_history_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `vehicle_events` (`event_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `vehicle_passports`
--
DROP TABLE IF EXISTS `vehicle_passports`;
CREATE TABLE `vehicle_passports` (
  `passport_id` varchar(255) NOT NULL,
  `vehicle_id` varchar(255) NOT NULL,
  `vin` varchar(255) NOT NULL,
  `engine_no` varchar(255) DEFAULT NULL,
  `registration_no` varchar(255) DEFAULT NULL,
  `make` varchar(255) DEFAULT NULL,
  `model` varchar(255) DEFAULT NULL,
  `year_of_manufacture` int DEFAULT NULL,
  `fuel_type` varchar(255) DEFAULT NULL,
  `body_type` varchar(255) DEFAULT NULL,
  `passport_status` varchar(50) DEFAULT 'ACTIVE',
  `passport_score` decimal(5,2) DEFAULT '100.00',
  `health_score` decimal(5,2) DEFAULT '100.00',
  `trust_score` decimal(5,2) DEFAULT '100.00',
  `total_events` int DEFAULT '0',
  `verified_events` int DEFAULT '0',
  `dealer_id` varchar(255) DEFAULT NULL,
  `branch_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`passport_id`),
  UNIQUE KEY `vehicle_id` (`vehicle_id`),
  UNIQUE KEY `vin` (`vin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `vehicle_repairs`
--
DROP TABLE IF EXISTS `vehicle_repairs`;
CREATE TABLE `vehicle_repairs` (
  `repair_id` varchar(255) NOT NULL,
  `passport_id` varchar(255) NOT NULL,
  `event_id` varchar(255) NOT NULL,
  `repair_type` varchar(100) NOT NULL,
  `severity` varchar(50) NOT NULL,
  `description` text,
  `workshop_name` varchar(255) DEFAULT NULL,
  `workshop_type` varchar(50) NOT NULL,
  `labour_cost` decimal(12,2) DEFAULT '0.00',
  `parts_cost` decimal(12,2) DEFAULT '0.00',
  `total_cost` decimal(12,2) DEFAULT '0.00',
  `verification_level` int DEFAULT '1',
  `repair_date` timestamp NOT NULL,
  PRIMARY KEY (`repair_id`),
  KEY `passport_id` (`passport_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `vehicle_repairs_ibfk_1` FOREIGN KEY (`passport_id`) REFERENCES `vehicle_passports` (`passport_id`) ON DELETE CASCADE,
  CONSTRAINT `vehicle_repairs_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `vehicle_events` (`event_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `warranty_claims`
--
DROP TABLE IF EXISTS `warranty_claims`;
CREATE TABLE `warranty_claims` (
  `claim_id` varchar(100) NOT NULL,
  `job_id` int unsigned NOT NULL,
  `claim_type` varchar(50) NOT NULL,
  `part_number` varchar(50) NOT NULL,
  `claim_amount` decimal(12,2) NOT NULL,
  `status` varchar(50) DEFAULT 'PENDING',
  `rejection_reason` text,
  `oem_reference_no` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`claim_id`),
  KEY `idx_wclaims_job` (`job_id`),
  CONSTRAINT `warranty_claims_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `job_card_master` (`job_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `warranty_dna`
--
DROP TABLE IF EXISTS `warranty_dna`;
CREATE TABLE `warranty_dna` (
  `dna_id` varchar(100) NOT NULL,
  `claim_no` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL,
  `approved` tinyint(1) DEFAULT '0',
  `evidence_used` text,
  `circular_applied` varchar(255) DEFAULT NULL,
  `failure_pattern` text,
  `technician` varchar(255) DEFAULT NULL,
  `vehicle` varchar(255) DEFAULT NULL,
  `part` varchar(255) DEFAULT NULL,
  `oem_questions` text,
  `time_to_approval_sec` int DEFAULT NULL,
  `lessons_learned` text,
  `ai_confidence` decimal(5,2) DEFAULT NULL,
  `golden_claim` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dna_id`),
  KEY `idx_wdna_claim` (`claim_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `warranty_passports`
--
DROP TABLE IF EXISTS `warranty_passports`;
CREATE TABLE `warranty_passports` (
  `passport_id` varchar(100) NOT NULL,
  `claim_id` varchar(100) NOT NULL,
  `identity_payload` text NOT NULL,
  `dna_payload` text NOT NULL,
  `timeline_payload` text NOT NULL,
  `relationships` text NOT NULL,
  `knowledge_links` text NOT NULL,
  `evidence_links` text NOT NULL,
  PRIMARY KEY (`passport_id`),
  KEY `claim_id` (`claim_id`),
  CONSTRAINT `warranty_passports_ibfk_1` FOREIGN KEY (`claim_id`) REFERENCES `warranty_claims` (`claim_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `warranty_rules`
--
DROP TABLE IF EXISTS `warranty_rules`;
CREATE TABLE `warranty_rules` (
  `rule_id` varchar(100) NOT NULL,
  `rule_name` varchar(100) NOT NULL,
  `rule_value` text NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`rule_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `workforce_attendance`
--
DROP TABLE IF EXISTS `workforce_attendance`;
CREATE TABLE `workforce_attendance` (
  `attendance_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `shift_date` varchar(20) NOT NULL,
  `check_in` varchar(20) DEFAULT NULL,
  `check_out` varchar(20) DEFAULT NULL,
  `shift_type` varchar(20) DEFAULT 'Morning',
  `status` varchar(20) DEFAULT 'Present',
  `notes` text,
  `created_at` varchar(40) DEFAULT NULL,
  `check_in_lat` double DEFAULT NULL,
  `check_in_lng` double DEFAULT NULL,
  `check_out_lat` double DEFAULT NULL,
  `check_out_lng` double DEFAULT NULL,
  `face_photo_in` longtext,
  `face_photo_out` longtext,
  `face_match_score_in` double DEFAULT NULL,
  `face_match_score_out` double DEFAULT NULL,
  `is_approved` tinyint(1) DEFAULT NULL,
  `break_start` varchar(20) DEFAULT NULL,
  `break_end` varchar(20) DEFAULT NULL,
  `is_late` tinyint(1) DEFAULT '0',
  `late_reason` varchar(255) DEFAULT NULL,
  `is_overtime` tinyint(1) DEFAULT '0',
  `overtime_hours` double DEFAULT '0',
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `uq_attendance_emp_date` (`employee_id`,`shift_date`),
  KEY `idx_attendance_emp_date` (`employee_id`,`shift_date`),
  KEY `idx_attendance_date` (`shift_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for `workshops`
--
DROP TABLE IF EXISTS `workshops`;
CREATE TABLE `workshops` (
  `workshop_id` int NOT NULL AUTO_INCREMENT,
  `workshop_name` varchar(100) NOT NULL,
  `latitude` decimal(9,6) NOT NULL,
  `longitude` decimal(9,6) NOT NULL,
  `allowed_gps_radius` int NOT NULL DEFAULT '200',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`workshop_id`),
  UNIQUE KEY `workshop_name` (`workshop_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- View structure for `customer_job_cards_view`
--
DROP VIEW IF EXISTS `customer_job_cards_view`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `customer_job_cards_view` AS select `job_cards`.`job_card_no` AS `job_card_no`,`job_cards`.`vrn` AS `vrn`,`job_cards`.`customer_name` AS `customer_name`,`job_cards`.`customer_mobile` AS `customer_mobile`,`job_cards`.`vehicle_make` AS `vehicle_make`,`job_cards`.`vehicle_model` AS `vehicle_model`,`job_cards`.`vehicle_year` AS `vehicle_year`,`job_cards`.`km_reading` AS `km_reading`,`job_cards`.`sr_type_id` AS `sr_type_id`,`job_cards`.`job_description` AS `job_description`,`job_cards`.`priority` AS `priority`,`job_cards`.`status` AS `status`,`job_cards`.`etd` AS `etd`,`job_cards`.`date_in` AS `date_in`,`job_cards`.`expected_date_out` AS `expected_date_out`,`job_cards`.`completed_at` AS `completed_at`,NULL AS `invoice_no`,`job_cards`.`gate_out_time` AS `gate_out_time`,NULL AS `warranty_status`,NULL AS `progress_pct` from `job_cards`;

--
-- View structure for `tbl_job_card`
--
DROP VIEW IF EXISTS `tbl_job_card`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `tbl_job_card` AS select `job_cards`.`job_id` AS `job_id`,`job_cards`.`job_card_no` AS `job_card_no`,`job_cards`.`crm_job_card_no` AS `crm_job_card_no`,`job_cards`.`vrn` AS `vrn`,`job_cards`.`customer_name` AS `customer_name`,`job_cards`.`customer_mobile` AS `customer_mobile`,`job_cards`.`vehicle_make` AS `vehicle_make`,`job_cards`.`vehicle_model` AS `vehicle_model`,`job_cards`.`vehicle_year` AS `vehicle_year`,`job_cards`.`km_reading` AS `km_reading`,`job_cards`.`sr_type_id` AS `sr_type_id`,`job_cards`.`job_description` AS `job_description`,`job_cards`.`priority` AS `priority`,`job_cards`.`bay_id` AS `bay_id`,`job_cards`.`status` AS `status`,`job_cards`.`etd` AS `etd`,`job_cards`.`started_at` AS `started_at`,`job_cards`.`completed_at` AS `completed_at`,`job_cards`.`invoiced_at` AS `invoiced_at`,`job_cards`.`created_by` AS `created_by`,`job_cards`.`created_at` AS `created_at`,`job_cards`.`updated_at` AS `updated_at`,`job_cards`.`workshop_stage` AS `workshop_stage`,`job_cards`.`l1_delay` AS `l1_delay`,`job_cards`.`l2_delay` AS `l2_delay`,`job_cards`.`l3_delay` AS `l3_delay`,`job_cards`.`l5_delay` AS `l5_delay`,`job_cards`.`delay_notes` AS `delay_notes`,`job_cards`.`time_slot` AS `time_slot`,`job_cards`.`tat_status` AS `tat_status`,`job_cards`.`pending_reason` AS `pending_reason`,`job_cards`.`remarks` AS `remarks`,`job_cards`.`date_in` AS `date_in`,`job_cards`.`time_in` AS `time_in`,`job_cards`.`expected_date_out` AS `expected_date_out`,`job_cards`.`expected_time_of_completion` AS `expected_time_of_completion`,`job_cards`.`time_out` AS `time_out`,`job_cards`.`date_completed` AS `date_completed`,`job_cards`.`bay_no` AS `bay_no`,`job_cards`.`service_advisor` AS `service_advisor`,`job_cards`.`technician_name` AS `technician_name`,`job_cards`.`no_of_laborers` AS `no_of_laborers`,`job_cards`.`actual_time_taken` AS `actual_time_taken`,`job_cards`.`numberplate_photo` AS `numberplate_photo`,`job_cards`.`odometer_photo` AS `odometer_photo`,`job_cards`.`labor_price` AS `labor_price`,`job_cards`.`parts_price` AS `parts_price`,`job_cards`.`vin` AS `vin`,`job_cards`.`last_service_date` AS `last_service_date`,`job_cards`.`odometer_reading` AS `odometer_reading`,`job_cards`.`invoice_ocr_data` AS `invoice_ocr_data`,`job_cards`.`gate_out_time` AS `gate_out_time` from `job_cards`;

--
-- View structure for `vw_bay_queue_display`
--
DROP VIEW IF EXISTS `vw_bay_queue_display`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vw_bay_queue_display` AS select `bq`.`queue_id` AS `queue_id`,`bq`.`bay_id` AS `bay_id`,`bq`.`job_card_id` AS `job_card_id`,`bq`.`queue_position` AS `queue_position`,`bq`.`queue_status` AS `queue_status`,`bq`.`assigned_at` AS `assigned_at`,`bq`.`created_by` AS `created_by`,`jc`.`job_card_no` AS `job_card_no`,`jc`.`vehicle_reg` AS `vehicle_reg`,`jc`.`customer_name` AS `customer_name`,`jc`.`service_type` AS `service_type`,`jc`.`etd` AS `etd`,`bm`.`bay_name` AS `bay_name`,`bm`.`bay_type` AS `bay_type` from ((`bay_queue` `bq` left join `job_card_master` `jc` on((`bq`.`job_card_id` = `jc`.`job_card_id`))) left join `bay_master` `bm` on((`bq`.`bay_id` = `bm`.`bay_id`))) where (`bq`.`queue_status` = 'In Progress');

--
-- View structure for `vw_revenue_report`
--
DROP VIEW IF EXISTS `vw_revenue_report`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vw_revenue_report` AS select `rsl`.`split_id` AS `split_id`,`rsl`.`job_card_no` AS `job_card_no`,`rsl`.`invoice_no` AS `invoice_no`,`rsl`.`invoice_date` AS `invoice_date`,`rsl`.`vehicle_reg` AS `vehicle_reg`,`rsl`.`service_type` AS `service_type`,`rsl`.`final_labour` AS `final_labour`,`rsl`.`final_spare` AS `final_spare`,(`rsl`.`final_labour` + `rsl`.`final_spare`) AS `total_revenue`,`jc`.`customer_name` AS `customer_name`,`jc`.`job_status` AS `job_status`,`em`.`full_name` AS `technician_name` from (((`revenue_split_log` `rsl` left join `job_card_master` `jc` on((`rsl`.`job_card_no` = `jc`.`job_card_no`))) left join `job_card_technician` `jt` on((`jc`.`job_card_id` = `jt`.`job_card_id`))) left join `employee_master` `em` on((`jt`.`technician_id` = `em`.`employee_id`))) order by `rsl`.`invoice_date` desc;

--
-- View structure for `vw_technician_jobs`
--
DROP VIEW IF EXISTS `vw_technician_jobs`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `vw_technician_jobs` AS select `jt`.`jct_id` AS `jct_id`,`jt`.`job_card_id` AS `job_card_id`,`jt`.`job_card_no` AS `job_card_no`,`jt`.`technician_id` AS `technician_id`,`em`.`full_name` AS `technician_name`,`em`.`role` AS `technician_role`,`jc`.`vehicle_reg` AS `vehicle_reg`,`jc`.`customer_name` AS `customer_name`,`jc`.`service_type` AS `service_type`,`jc`.`job_status` AS `job_status`,`jt`.`role_type` AS `role_type`,`jt`.`time_in` AS `time_in`,`jt`.`time_out` AS `time_out`,`bm`.`bay_name` AS `bay_name` from ((((`job_card_technician` `jt` left join `employee_master` `em` on((`jt`.`technician_id` = `em`.`employee_id`))) left join `job_card_master` `jc` on((`jt`.`job_card_id` = `jc`.`job_card_id`))) left join `bay_queue` `bq` on((`jt`.`job_card_id` = `bq`.`job_card_id`))) left join `bay_master` `bm` on((`bq`.`bay_id` = `bm`.`bay_id`))) where (`jc`.`job_status` = 'In Progress');

SET FOREIGN_KEY_CHECKS=1;
