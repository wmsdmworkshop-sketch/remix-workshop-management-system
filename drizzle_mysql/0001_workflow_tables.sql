-- =============================================================================
-- Migration: 0001_workflow_tables
-- Requirement: REQ-01, REQ-02, REQ-04, REQ-05, REQ-06, REQ-07, REQ-08
-- Bounded Context: Workshop Operations / Workflow Management
-- Idempotency: Enforced via schema checking and conditional column addition
-- =============================================================================

-- UP SECTION
-- 1. Extend job_cards table with WOS operational fields (Idempotency Enforced)
SET @dbname = DATABASE();
SET @tablename = 'job_cards';

-- emergency_flag
SET @colname = 'emergency_flag';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @colname) > 0,
    'SELECT "Column emergency_flag already exists" AS status;',
    'ALTER TABLE `job_cards` ADD COLUMN `emergency_flag` boolean DEFAULT false;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- rework_count
SET @colname = 'rework_count';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @colname) > 0,
    'SELECT "Column rework_count already exists" AS status;',
    'ALTER TABLE `job_cards` ADD COLUMN `rework_count` int DEFAULT 0;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- current_workflow_state
SET @colname = 'current_workflow_state';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @colname) > 0,
    'SELECT "Column current_workflow_state already exists" AS status;',
    'ALTER TABLE `job_cards` ADD COLUMN `current_workflow_state` text DEFAULT ("GATE_IN");'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- current_queue
SET @colname = 'current_queue';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @colname) > 0,
    'SELECT "Column current_queue already exists" AS status;',
    'ALTER TABLE `job_cards` ADD COLUMN `current_queue` text NULL;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- sla_status
SET @colname = 'sla_status';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @colname) > 0,
    'SELECT "Column sla_status already exists" AS status;',
    'ALTER TABLE `job_cards` ADD COLUMN `sla_status` text DEFAULT ("WITHIN_SLA");'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- current_etd
SET @colname = 'current_etd';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @colname) > 0,
    'SELECT "Column current_etd already exists" AS status;',
    'ALTER TABLE `job_cards` ADD COLUMN `current_etd` timestamp NULL;'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- 2. Create tbl_workflow_history table
CREATE TABLE IF NOT EXISTS `tbl_workflow_history` (
	`history_id` serial AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`old_state` text,
	`new_state` text NOT NULL,
	`queue` text,
	`sla_status` text,
	`etd` timestamp,
	`transition_by` int,
	`transition_time` timestamp DEFAULT (now()),
	`duration` int,
	`reason` text,
	CONSTRAINT `tbl_workflow_history_history_id` PRIMARY KEY(`history_id`)
);

-- DOWN SECTION (ROLLBACK VERIFICATION)
/*
-- To rollback this migration, run the following:
ALTER TABLE `job_cards` DROP COLUMN `emergency_flag`;
ALTER TABLE `job_cards` DROP COLUMN `rework_count`;
ALTER TABLE `job_cards` DROP COLUMN `current_workflow_state`;
ALTER TABLE `job_cards` DROP COLUMN `current_queue`;
ALTER TABLE `job_cards` DROP COLUMN `sla_status`;
ALTER TABLE `job_cards` DROP COLUMN `current_etd`;
DROP TABLE IF EXISTS `tbl_workflow_history`;
*/
