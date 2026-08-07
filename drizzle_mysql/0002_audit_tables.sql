-- =============================================================================
-- Migration: 0002_audit_tables
-- Requirement: REQ-10
-- Bounded Context: Auditing & Security
-- Idempotency: Enforced via CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- UP SECTION
CREATE TABLE IF NOT EXISTS `tbl_audit_trail` (
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

-- DOWN SECTION (ROLLBACK VERIFICATION)
/*
-- To rollback this migration, run the following:
DROP TABLE IF EXISTS `tbl_audit_trail`;
*/
