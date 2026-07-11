-- =============================================================================
-- Migration: 0003_notifications
-- Requirement: REQ-09
-- Bounded Context: Notifications
-- Idempotency: Enforced via CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- UP SECTION
CREATE TABLE IF NOT EXISTS `tbl_notifications` (
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

-- DOWN SECTION (ROLLBACK VERIFICATION)
/*
-- To rollback this migration, run the following:
DROP TABLE IF EXISTS `tbl_notifications`;
*/
