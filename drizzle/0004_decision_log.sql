-- =============================================================================
-- Migration: 0004_decision_log
-- Requirement: REQ-11
-- Bounded Context: Operations / Override Management
-- Idempotency: Enforced via CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- UP SECTION
CREATE TABLE IF NOT EXISTS `tbl_decision_log` (
	`decision_id` serial AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`decision_type` text NOT NULL,
	`entity_type` text NOT NULL DEFAULT ('job_card'),
	`entity_id` int NOT NULL,
	`ai_recommended_value` text,
	`actual_selected_value` text NOT NULL,
	`override_flag` boolean DEFAULT false,
	`reason_code` text NOT NULL,
	`justification` text NOT NULL,
	`actor_id` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`outcome` text,
	`confidence_score` decimal(4,3),
	CONSTRAINT `tbl_decision_log_decision_id` PRIMARY KEY(`decision_id`)
);

-- DOWN SECTION (ROLLBACK VERIFICATION)
/*
-- To rollback this migration, run the following:
DROP TABLE IF EXISTS `tbl_decision_log`;
*/
