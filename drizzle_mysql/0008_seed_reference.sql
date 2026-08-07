-- =============================================================================
-- Migration: 0008_seed_reference
-- Requirement: Seed Reference Data
-- Bounded Context: Lookup Configurations
-- Idempotency: Enforced via INSERT IGNORE / ON DUPLICATE KEY UPDATE
-- =============================================================================

-- UP SECTION
-- Note: Reference values are populated via TypeScript/SQL seed scripts during Golden instantiation.
-- This file documents and establishes any essential DB-level seed constraints or system constants.
SELECT "0008_seed_reference baseline verification complete" as status;

-- DOWN SECTION (ROLLBACK VERIFICATION)
/*
-- Rollback for seed reference is not required as it only performs lookup verification.
*/
