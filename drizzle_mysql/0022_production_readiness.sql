CREATE TABLE `tbl_system_configuration` (
	`config_key` varchar(150) NOT NULL,
	`config_value` text,
	`description` text,
	`module` varchar(50),
	`is_encrypted` boolean DEFAULT false,
	`updated_at` timestamp DEFAULT (now()),
	`updated_by` varchar(50),
	CONSTRAINT `tbl_system_configuration_config_key` PRIMARY KEY(`config_key`)
);

CREATE TABLE `tbl_feature_flag` (
	`flag_key` varchar(150) NOT NULL,
	`is_enabled` boolean DEFAULT false,
	`description` text,
	`rollout_percentage` int DEFAULT 100,
	`updated_at` timestamp DEFAULT (now()),
	`updated_by` varchar(50),
	CONSTRAINT `tbl_feature_flag_flag_key` PRIMARY KEY(`flag_key`)
);

CREATE TABLE `tbl_branch_configuration` (
	`branch_id` varchar(50) NOT NULL,
	`config_key` varchar(150) NOT NULL,
	`config_value` text,
	`updated_at` timestamp DEFAULT (now()),
	`updated_by` varchar(50),
	CONSTRAINT `tbl_branch_configuration_branch_id_config_key` PRIMARY KEY(`branch_id`,`config_key`)
);

CREATE TABLE `tbl_system_health` (
	`health_id` varchar(50) NOT NULL,
	`service_name` varchar(100),
	`status` varchar(50),
	`metrics_json` text,
	`checked_at` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_system_health_health_id` PRIMARY KEY(`health_id`)
);

CREATE TABLE `tbl_job_execution` (
	`execution_id` varchar(50) NOT NULL,
	`job_name` varchar(100),
	`start_time` timestamp DEFAULT (now()),
	`end_time` timestamp,
	`status` varchar(50),
	`error_details` text,
	`duration_ms` int,
	CONSTRAINT `tbl_job_execution_execution_id` PRIMARY KEY(`execution_id`)
);

CREATE TABLE `tbl_scheduler_history` (
	`history_id` varchar(50) NOT NULL,
	`scheduler_name` varchar(100),
	`trigger_time` timestamp DEFAULT (now()),
	`status` varchar(50),
	CONSTRAINT `tbl_scheduler_history_history_id` PRIMARY KEY(`history_id`)
);

CREATE TABLE `tbl_application_log` (
	`log_id` varchar(50) NOT NULL,
	`level` varchar(20),
	`module` varchar(50),
	`correlation_id` varchar(100),
	`message` text,
	`stack_trace` text,
	`timestamp` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_application_log_log_id` PRIMARY KEY(`log_id`)
);

CREATE TABLE `tbl_enterprise_audit` (
	`audit_id` varchar(50) NOT NULL,
	`correlation_id` varchar(100),
	`event_type` varchar(100),
	`module` varchar(50),
	`user_id` varchar(50),
	`reference_id` varchar(50),
	`old_value_json` text,
	`new_value_json` text,
	`ip_address` varchar(50),
	`is_sensitive` boolean DEFAULT false,
	`timestamp` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_enterprise_audit_audit_id` PRIMARY KEY(`audit_id`)
);
