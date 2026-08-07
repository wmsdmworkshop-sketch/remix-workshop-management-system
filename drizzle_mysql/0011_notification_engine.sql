-- Forward Migration: Sprint 5 Enterprise Notification Engine

CREATE TABLE IF NOT EXISTS `tbl_event_outbox` (
  `event_id` varchar(50) NOT NULL,
  `topic` text NOT NULL,
  `payload` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `retry_count` int NOT NULL DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `processed_at` timestamp NULL,
  PRIMARY KEY (`event_id`)
);

CREATE TABLE IF NOT EXISTS `tbl_notification_templates` (
  `template_code` varchar(100) NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `channel` varchar(20) NOT NULL,
  `language` varchar(10) NOT NULL DEFAULT 'en',
  `subject_template` text NOT NULL,
  `body_template` text NOT NULL,
  `variables` text,
  `is_active` boolean NOT NULL DEFAULT 1,
  PRIMARY KEY (`template_code`)
);

CREATE TABLE IF NOT EXISTS `tbl_notification_dispatch` (
  `dispatch_id` varchar(50) NOT NULL,
  `event_id` varchar(50) NULL,
  `correlation_id` varchar(50) NULL,
  `recipient` varchar(100) NOT NULL,
  `template_code` varchar(100) NOT NULL,
  `priority` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'CREATED',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dispatch_id`)
);

CREATE TABLE IF NOT EXISTS `tbl_notification_delivery` (
  `delivery_id` varchar(50) NOT NULL,
  `dispatch_id` varchar(50) NOT NULL,
  `channel` varchar(20) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL,
  `attempt_number` int NOT NULL DEFAULT 1,
  `provider_response` text NULL,
  `sent_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` timestamp NULL,
  PRIMARY KEY (`delivery_id`)
);

CREATE TABLE IF NOT EXISTS `tbl_notification_read` (
  `dispatch_id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `read_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `acknowledged` boolean NOT NULL DEFAULT 0,
  PRIMARY KEY (`dispatch_id`, `user_id`)
);

CREATE TABLE IF NOT EXISTS `tbl_notification_preferences` (
  `user_id` varchar(50) NOT NULL,
  `preferences_json` text NOT NULL,
  PRIMARY KEY (`user_id`)
);
