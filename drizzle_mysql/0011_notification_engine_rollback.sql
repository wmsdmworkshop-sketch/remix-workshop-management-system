-- Rollback Migration: Sprint 5 Enterprise Notification Engine

DROP TABLE IF EXISTS `tbl_notification_preferences`;
DROP TABLE IF EXISTS `tbl_notification_read`;
DROP TABLE IF EXISTS `tbl_notification_delivery`;
DROP TABLE IF EXISTS `tbl_notification_dispatch`;
DROP TABLE IF EXISTS `tbl_notification_templates`;
DROP TABLE IF EXISTS `tbl_event_outbox`;
