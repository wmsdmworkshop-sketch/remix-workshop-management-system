CREATE TABLE `tbl_dashboard` (
	`dashboard_id` varchar(50) NOT NULL,
	`dashboard_name` varchar(150) NOT NULL,
	`dashboard_type` varchar(50),
	`user_role` varchar(50),
	`refresh_frequency` varchar(50),
	`status` varchar(50),
	CONSTRAINT `tbl_dashboard_dashboard_id` PRIMARY KEY(`dashboard_id`)
);

CREATE TABLE `tbl_dashboard_widget` (
	`widget_id` varchar(50) NOT NULL,
	`dashboard_id` varchar(50) NOT NULL,
	`widget_type` varchar(50),
	`chart_type` varchar(50),
	`sequence` int,
	`configuration_json` text,
	`status` varchar(50),
	CONSTRAINT `tbl_dashboard_widget_widget_id` PRIMARY KEY(`widget_id`)
);

CREATE TABLE `tbl_kpi_catalog` (
	`kpi_id` varchar(50) NOT NULL,
	`kpi_name` varchar(150) NOT NULL,
	`formula` text,
	`owner_module` varchar(50),
	`refresh_policy` varchar(50),
	`unit` varchar(20),
	`default_target` decimal(15,2),
	`status` varchar(50),
	CONSTRAINT `tbl_kpi_catalog_kpi_id` PRIMARY KEY(`kpi_id`)
);

CREATE TABLE `tbl_kpi_snapshot` (
	`snapshot_id` varchar(50) NOT NULL,
	`kpi_id` varchar(50) NOT NULL,
	`run_id` varchar(50),
	`version` int DEFAULT 1,
	`snapshot_time` timestamp DEFAULT (now()),
	`branch_id` varchar(50),
	`business_unit` varchar(50),
	`kpi_value` decimal(15,2),
	`target` decimal(15,2),
	`variance` decimal(15,2),
	`trend` varchar(50),
	CONSTRAINT `tbl_kpi_snapshot_snapshot_id` PRIMARY KEY(`snapshot_id`)
);

CREATE TABLE `tbl_report_definition` (
	`report_def_id` varchar(50) NOT NULL,
	`report_name` varchar(150),
	`module` varchar(50),
	`query_json` text,
	`status` varchar(50),
	CONSTRAINT `tbl_report_definition_report_def_id` PRIMARY KEY(`report_def_id`)
);

CREATE TABLE `tbl_report_history` (
	`report_history_id` varchar(50) NOT NULL,
	`report_def_id` varchar(50),
	`generated_by` varchar(50),
	`generated_time` timestamp DEFAULT (now()),
	`parameters_json` text,
	`output_format` varchar(20),
	`execution_status` varchar(50),
	CONSTRAINT `tbl_report_history_report_history_id` PRIMARY KEY(`report_history_id`)
);

CREATE TABLE `tbl_alert_rule` (
	`rule_id` varchar(50) NOT NULL,
	`rule_name` varchar(150),
	`kpi_id` varchar(50),
	`threshold` decimal(15,2),
	`operator` varchar(10),
	`notification_target` varchar(100),
	`priority` varchar(20),
	`status` varchar(50),
	CONSTRAINT `tbl_alert_rule_rule_id` PRIMARY KEY(`rule_id`)
);

CREATE TABLE `tbl_alert_history` (
	`alert_id` varchar(50) NOT NULL,
	`rule_id` varchar(50),
	`actual_value` decimal(15,2),
	`threshold` decimal(15,2),
	`raised_time` timestamp DEFAULT (now()),
	`acknowledged_by` varchar(50),
	`resolution` text,
	CONSTRAINT `tbl_alert_history_alert_id` PRIMARY KEY(`alert_id`)
);

CREATE TABLE `tbl_exception_register` (
	`exception_id` varchar(50) NOT NULL,
	`module` varchar(50),
	`reference_id` varchar(50),
	`description` text,
	`severity` varchar(50),
	`status` varchar(50),
	`logged_time` timestamp DEFAULT (now()),
	`resolved_time` timestamp,
	`resolved_by` varchar(50),
	CONSTRAINT `tbl_exception_register_exception_id` PRIMARY KEY(`exception_id`)
);
