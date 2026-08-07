-- =============================================================================
-- DWIP Enterprise Platform — WP-04 Database Performance & Indexing Optimization
-- Target Database: MySQL 8.0+ (Devanand Automobiles DWIP Production DB)
-- Description: Non-destructive index optimization script adding compound indexes
--              for high-frequency query paths across Job Cards, Invoices,
--              Warranty Claims, Audit Trail, and Delegation tables.
-- Note: Physical table renaming is DEFERRED per Architecture Blueprint decision.
-- =============================================================================

-- 1. High-Frequency Job Card Indexes
ALTER TABLE `job_cards` 
  ADD INDEX `idx_jc_vrn_status` (`vrn`, `status`),
  ADD INDEX `idx_jc_created_status` (`created_at`, `status`),
  ADD INDEX `idx_jc_advisor_created` (`service_advisor`, `created_at`);

-- 2. Financial & Invoicing Indexes
ALTER TABLE `invoices` 
  ADD INDEX `idx_inv_job_status` (`job_id`, `status`),
  ADD INDEX `idx_inv_created` (`created_at`);

-- 3. Warranty Claims Indexes
ALTER TABLE `warranty_claims` 
  ADD INDEX `idx_wc_job_type_status` (`job_id`, `claim_type`, `status`);

-- 4. Audit Trail Search Indexes
ALTER TABLE `tbl_audit_trail` 
  ADD INDEX `idx_audit_user_time` (`user_id`, `timestamp`),
  ADD INDEX `idx_audit_correlation` (`correlation_id`);

-- 5. User Delegations Time-Bound Range Index
ALTER TABLE `user_delegations` 
  ADD INDEX `idx_deleg_delegatee_dates` (`delegatee_id`, `effective_from`, `effective_until`);

-- Analyze tables to update MySQL query optimizer statistics
ANALYZE TABLE `job_cards`, `invoices`, `warranty_claims`, `tbl_audit_trail`, `user_delegations`;
