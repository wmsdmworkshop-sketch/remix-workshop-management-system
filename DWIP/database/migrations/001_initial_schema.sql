-- Migration 001 — Initial schema creation
-- Run: sqlite3 dwip.db < migrations/001_initial_schema.sql
-- Idempotent: uses CREATE TABLE IF NOT EXISTS throughout

.read schema.sql

INSERT INTO rpt_merge_log (phase, action, details)
VALUES ('MIGRATION', 'Schema Created', 'Migration 001 applied — initial schema created.');
