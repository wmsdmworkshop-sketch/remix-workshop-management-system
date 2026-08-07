-- =============================================================================
-- SPRINT 6: ENTERPRISE SLA & ESCALATION ENGINE
-- =============================================================================

CREATE TABLE `tbl_business_calendar` (
  `calendar_id` varchar(50) PRIMARY KEY,
  `workshop_id` int,
  `date` varchar(10) NOT NULL,
  `is_working_day` boolean NOT NULL DEFAULT true,
  `shift_start_time` varchar(8) NOT NULL,
  `shift_end_time` varchar(8) NOT NULL,
  `holiday_reason` text
);

CREATE TABLE `tbl_sla_policy` (
  `policy_id` varchar(50) PRIMARY KEY,
  `policy_name` varchar(100) NOT NULL,
  `sla_type` varchar(50) NOT NULL,
  `workshop_id` int,
  `service_type` varchar(50),
  `customer_category` varchar(50),
  `vehicle_category` varchar(50),
  `operation_type` varchar(50),
  `base_minutes_limit` int NOT NULL,
  `is_24x7` boolean NOT NULL DEFAULT false,
  `is_active` boolean NOT NULL DEFAULT true
);

CREATE TABLE `tbl_sla_instance` (
  `instance_id` varchar(50) PRIMARY KEY,
  `policy_id` varchar(50) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp
);

CREATE TABLE `tbl_sla_timer` (
  `timer_id` varchar(50) PRIMARY KEY,
  `instance_id` varchar(50) NOT NULL,
  `start_time` timestamp NOT NULL,
  `target_breach_time` timestamp NOT NULL,
  `paused_at` timestamp,
  `accumulated_pause_ms` int NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL
);

CREATE TABLE `tbl_sla_escalation` (
  `escalation_id` varchar(50) PRIMARY KEY,
  `policy_id` varchar(50) NOT NULL,
  `escalation_level` int NOT NULL,
  `trigger_minutes_after_breach` int NOT NULL DEFAULT 0,
  `target_role` varchar(50) NOT NULL,
  `severity` varchar(20) NOT NULL
);

CREATE TABLE `tbl_sla_history` (
  `history_id` varchar(50) PRIMARY KEY,
  `instance_id` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `details` text,
  `timestamp` timestamp DEFAULT CURRENT_TIMESTAMP
);
