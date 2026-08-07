-- =============================================================================
-- Migration: 0006_validation
-- Requirement: ETL Pipeline Audits
-- Bounded Context: ETL & Data Quality
-- Idempotency: Enforced via CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- UP SECTION
CREATE TABLE IF NOT EXISTS `tbl_validation_run` (
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

-- DOWN SECTION (ROLLBACK VERIFICATION)
/*
-- To rollback this migration, run the following:
ALTER TABLE `tbl_validation_run` DROP INDEX `idx_validation_run_id`;
DROP TABLE IF EXISTS `tbl_validation_run`;
*/
