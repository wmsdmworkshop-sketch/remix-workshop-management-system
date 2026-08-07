-- =============================================================================
-- Migration: 0007_indexes
-- Requirement: Index Strategy
-- Bounded Context: Operational Indexes
-- Idempotency: Enforced via CREATE INDEX statements
-- =============================================================================

-- UP SECTION
CREATE INDEX `idx_certs_employee` ON `dim_certifications` (`employee_id`);
CREATE INDEX `idx_approvals_job` ON `rpt_digital_approvals` (`job_id`);
CREATE INDEX `idx_approvals_method` ON `rpt_digital_approvals` (`job_id`,`approval_method`);
CREATE INDEX `idx_qc_job` ON `rpt_qc_checklists` (`job_id`);
CREATE INDEX `idx_qc_results` ON `rpt_qc_checklists` (`result`,`job_id`);
CREATE INDEX `idx_audit_entity` ON `tbl_audit_trail` (`entity_type`,`entity_id`);
CREATE INDEX `idx_audit_timestamp` ON `tbl_audit_trail` (`created_at`);
CREATE INDEX `idx_decision_job` ON `tbl_decision_log` (`job_id`);
CREATE INDEX `idx_decision_type` ON `tbl_decision_log` (`decision_type`);
CREATE INDEX `idx_notifications_user` ON `tbl_notifications` (`user_id`,`is_read`);
CREATE INDEX `idx_workflow_history_job` ON `tbl_workflow_history` (`job_id`);
CREATE INDEX `idx_workflow_history_states` ON `tbl_workflow_history` (`new_state`,`old_state`);

-- DOWN SECTION (ROLLBACK VERIFICATION)
/*
-- To rollback this migration, run the following:
ALTER TABLE `dim_certifications` DROP INDEX `idx_certs_employee`;
ALTER TABLE `rpt_digital_approvals` DROP INDEX `idx_approvals_job`;
ALTER TABLE `rpt_digital_approvals` DROP INDEX `idx_approvals_method`;
ALTER TABLE `rpt_qc_checklists` DROP INDEX `idx_qc_job`;
ALTER TABLE `rpt_qc_checklists` DROP INDEX `idx_qc_results`;
ALTER TABLE `tbl_audit_trail` DROP INDEX `idx_audit_entity`;
ALTER TABLE `tbl_audit_trail` DROP INDEX `idx_audit_timestamp`;
ALTER TABLE `tbl_decision_log` DROP INDEX `idx_decision_job`;
ALTER TABLE `tbl_decision_log` DROP INDEX `idx_decision_type`;
ALTER TABLE `tbl_notifications` DROP INDEX `idx_notifications_user`;
ALTER TABLE `tbl_workflow_history` DROP INDEX `idx_workflow_history_job`;
ALTER TABLE `tbl_workflow_history` DROP INDEX `idx_workflow_history_states`;
*/
