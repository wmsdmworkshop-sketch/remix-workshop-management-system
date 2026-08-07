-- =============================================================================
-- SPRINT 6: ENTERPRISE SLA & ESCALATION ENGINE - VERIFY
-- =============================================================================

SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_business_calendar';
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_sla_policy';
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_sla_instance';
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_sla_timer';
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_sla_escalation';
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_sla_history';
