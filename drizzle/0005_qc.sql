-- =============================================================================
-- Migration: 0005_qc
-- Requirement: REQ-03, REQ-05
-- Bounded Context: Quality Control & Digital Approvals & Technicians
-- Idempotency: Enforced via CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- UP SECTION
-- 1. QC Checklist Runs
CREATE TABLE IF NOT EXISTS `rpt_qc_checklists` (
	`qc_checklist_id` serial AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`inspector_id` int NOT NULL,
	`result` text NOT NULL,
	`check_items_json` text,
	`road_test_km` int,
	`inspector_notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `rpt_qc_checklists_qc_checklist_id` PRIMARY KEY(`qc_checklist_id`)
);

-- 2. Customer Digital Approvals
CREATE TABLE IF NOT EXISTS `rpt_digital_approvals` (
	`approval_id` serial AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`signature_url` text,
	`approval_method` text NOT NULL,
	`otp_hash` text,
	`estimate_version` int DEFAULT 1,
	`approved_amount` decimal(12,2),
	`captured_by` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `rpt_digital_approvals_approval_id` PRIMARY KEY(`approval_id`)
);

-- 3. Technician Skill Certifications
CREATE TABLE IF NOT EXISTS `dim_certifications` (
	`cert_id` serial AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`certification_name` text NOT NULL,
	`issuing_authority` text,
	`certified_on` timestamp,
	`valid_until` timestamp,
	`is_active` boolean DEFAULT true,
	CONSTRAINT `dim_certifications_cert_id` PRIMARY KEY(`cert_id`)
);

-- DOWN SECTION (ROLLBACK VERIFICATION)
/*
-- To rollback this migration, run the following:
DROP TABLE IF EXISTS `rpt_qc_checklists`;
DROP TABLE IF EXISTS `rpt_digital_approvals`;
DROP TABLE IF EXISTS `dim_certifications`;
*/
