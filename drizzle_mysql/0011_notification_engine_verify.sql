-- Verification Migration: Sprint 5 Enterprise Notification Engine

SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_event_outbox';
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_notification_templates';
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_notification_dispatch';
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_notification_delivery';
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_notification_read';
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tbl_notification_preferences';
