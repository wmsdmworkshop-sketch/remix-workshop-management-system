CREATE TABLE `tbl_ai_model` (
	`model_id` varchar(50) NOT NULL,
	`model_name` varchar(150) NOT NULL,
	`version` varchar(20),
	`purpose` varchar(100),
	`owner` varchar(50),
	`training_frequency` varchar(50),
	`dataset_metadata` text,
	`accuracy_metric` decimal(5,2),
	`status` varchar(50),
	CONSTRAINT `tbl_ai_model_model_id` PRIMARY KEY(`model_id`)
);

CREATE TABLE `tbl_ai_feature_store` (
	`feature_id` varchar(50) NOT NULL,
	`feature_name` varchar(100),
	`module` varchar(50),
	`calculation_logic` text,
	`last_calculated` timestamp,
	`status` varchar(50),
	CONSTRAINT `tbl_ai_feature_store_feature_id` PRIMARY KEY(`feature_id`)
);

CREATE TABLE `tbl_ai_prediction` (
	`prediction_id` varchar(50) NOT NULL,
	`prediction_type` varchar(50),
	`reference_module` varchar(50),
	`reference_id` varchar(50),
	`prediction` text,
	`confidence_score` decimal(5,2),
	`prediction_date` timestamp DEFAULT (now()),
	`expiry_date` timestamp,
	`status` varchar(50),
	CONSTRAINT `tbl_ai_prediction_prediction_id` PRIMARY KEY(`prediction_id`)
);

CREATE TABLE `tbl_ai_recommendation` (
	`recommendation_id` varchar(50) NOT NULL,
	`module` varchar(50),
	`reference_id` varchar(50),
	`recommendation` text,
	`priority` varchar(50),
	`business_impact` text,
	`confidence_score` decimal(5,2),
	`reasoning_summary` text,
	`created_time` timestamp DEFAULT (now()),
	`status` varchar(50),
	CONSTRAINT `tbl_ai_recommendation_recommendation_id` PRIMARY KEY(`recommendation_id`)
);

CREATE TABLE `tbl_ai_anomaly` (
	`anomaly_id` varchar(50) NOT NULL,
	`module` varchar(50),
	`reference_id` varchar(50),
	`severity` varchar(50),
	`expected_value` decimal(15,2),
	`actual_value` decimal(15,2),
	`deviation` decimal(15,2),
	`detected_time` timestamp DEFAULT (now()),
	`status` varchar(50),
	CONSTRAINT `tbl_ai_anomaly_anomaly_id` PRIMARY KEY(`anomaly_id`)
);

CREATE TABLE `tbl_ai_root_cause` (
	`analysis_id` varchar(50) NOT NULL,
	`module` varchar(50),
	`reference_id` varchar(50),
	`root_cause` text,
	`contributing_factors` text,
	`confidence` decimal(5,2),
	`generated_time` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_ai_root_cause_analysis_id` PRIMARY KEY(`analysis_id`)
);

CREATE TABLE `tbl_ai_forecast` (
	`forecast_id` varchar(50) NOT NULL,
	`forecast_type` varchar(50),
	`forecast_period` varchar(50),
	`predicted_value` decimal(15,2),
	`confidence` decimal(5,2),
	`generated_time` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_ai_forecast_forecast_id` PRIMARY KEY(`forecast_id`)
);

CREATE TABLE `tbl_ai_conversation` (
	`conversation_id` varchar(50) NOT NULL,
	`user_id` varchar(50),
	`question` text,
	`generated_sql_json` text,
	`response_summary` text,
	`timestamp` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_ai_conversation_conversation_id` PRIMARY KEY(`conversation_id`)
);

CREATE TABLE `tbl_ai_feedback` (
	`feedback_id` varchar(50) NOT NULL,
	`recommendation_id` varchar(50),
	`accepted` boolean DEFAULT false,
	`rejected` boolean DEFAULT false,
	`user_id` varchar(50),
	`comments` text,
	`learning_flag` boolean DEFAULT false,
	CONSTRAINT `tbl_ai_feedback_feedback_id` PRIMARY KEY(`feedback_id`)
);

CREATE TABLE `tbl_ai_knowledge` (
	`knowledge_id` varchar(50) NOT NULL,
	`topic` varchar(150),
	`content` text,
	`source_document` varchar(150),
	`last_updated` timestamp DEFAULT (now()),
	`status` varchar(50),
	CONSTRAINT `tbl_ai_knowledge_knowledge_id` PRIMARY KEY(`knowledge_id`)
);

CREATE TABLE `tbl_ai_decision_log` (
	`decision_log_id` varchar(50) NOT NULL,
	`ai_output_type` varchar(50),
	`reference_id` varchar(50),
	`input_features_json` text,
	`model_version` varchar(50),
	`reasoning_trace` text,
	`logged_time` timestamp DEFAULT (now()),
	CONSTRAINT `tbl_ai_decision_log_decision_log_id` PRIMARY KEY(`decision_log_id`)
);
