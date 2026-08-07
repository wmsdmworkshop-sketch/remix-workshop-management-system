-- =============================================================================
-- DWIP ENTERPRISE WOS MIGRATION DDL
-- Specification: DWIP-DB-001 Version 1.0 Canonical Freeze
-- Migration ID: 0002_vos_foundation
-- Executed At: 2026-07-31
-- =============================================================================
-- PURPOSE:
-- Establishes the persistent domain foundation for Vehicle Operational Sessions (VOS).
-- Creates the master `vos` session table, history audit logs, timeline nodes,
-- workflow configuration references, module links, telemetry attributes, and tags.
--
-- ROLLBACK STRATEGY:
-- DROP TABLE IF EXISTS vos_tags;
-- DROP TABLE IF EXISTS vos_attributes;
-- DROP TABLE IF EXISTS vos_links;
-- DROP TABLE IF EXISTS vos_configuration_reference;
-- DROP TABLE IF EXISTS vos_timeline;
-- DROP TABLE IF EXISTS vos_owner_history;
-- DROP TABLE IF EXISTS vos_state_history;
-- DROP TABLE IF EXISTS vos;
--
-- COMPATIBILITY ASSESSMENT:
-- Fully backward-compatible addition. Introduces non-breaking VOS foundation tables.
--
-- AFFECTED MODULES:
-- Workshop Operations, Service Operations, Parts & Warranty, Executive Cockpit.
--
-- EXECUTION NOTES:
-- Execute using Drizzle ORM migration runner or MySQL 8.0+ CLI.
-- =============================================================================

-- 1. Master Vehicle Operational Sessions Table
CREATE TABLE IF NOT EXISTS `vos` (
  `id` VARCHAR(36) NOT NULL,
  `public_id` VARCHAR(100) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `dealer_id` VARCHAR(50) NOT NULL,
  `vos_number` VARCHAR(100) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `vehicle_id` VARCHAR(50) NOT NULL,
  `vehicle_external_id` VARCHAR(100) NULL,
  `customer_id` VARCHAR(50) NOT NULL,
  `customer_external_id` VARCHAR(100) NULL,
  `visit_type` VARCHAR(50) NOT NULL DEFAULT 'NORMAL_SERVICE',
  `commercial_type` VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER_PAY',
  `entry_source` VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  `is_breakdown` TINYINT(1) NOT NULL DEFAULT 0,
  `gate_in_latitude` DOUBLE NULL,
  `gate_in_longitude` DOUBLE NULL,
  `location_accuracy` FLOAT NULL,
  `current_state` VARCHAR(50) NOT NULL DEFAULT 'GATE_IN',
  `current_state_code` VARCHAR(50) NOT NULL DEFAULT 'STATE_GATE_IN',
  `current_state_version` INT NOT NULL DEFAULT 1,
  `current_owner` VARCHAR(50) NOT NULL,
  `operational_status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  `priority` VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  `risk_level` VARCHAR(20) NOT NULL DEFAULT 'LOW',
  `risk_score` INT NOT NULL DEFAULT 0,
  `risk_reason` TEXT NULL,
  `source_system` VARCHAR(50) NULL,
  `sync_status` VARCHAR(50) NULL,
  `sync_version` INT NULL DEFAULT 1,
  `last_synced_at` TIMESTAMP NULL,
  `external_reference` VARCHAR(100) NULL,
  `data_classification` VARCHAR(30) NOT NULL DEFAULT 'INTERNAL',
  `gate_in_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `gate_out_time` TIMESTAMP NULL,
  `closed_at` TIMESTAMP NULL,
  `is_closed` TINYINT(1) NOT NULL DEFAULT 0,
  `registration_number` VARCHAR(50) NOT NULL,
  `chassis_number` VARCHAR(100) NOT NULL,
  `engine_number` VARCHAR(100) NULL,
  `vehicle_model` VARCHAR(100) NULL,
  `vehicle_variant` VARCHAR(100) NULL,
  `fuel_type` VARCHAR(50) NULL,
  `emission_norm` VARCHAR(50) NULL,
  `manufacturing_year` INT NULL,
  `odometer_at_gate_in` INT NULL,
  `warranty_status_at_gate_in` VARCHAR(50) NULL,
  `oem_service_plan` VARCHAR(100) NULL,
  `driver_name` VARCHAR(100) NULL,
  `driver_mobile` VARCHAR(30) NULL,
  `driver_license_number` VARCHAR(50) NULL,
  `driver_type` VARCHAR(50) NULL,
  `customer_name` VARCHAR(150) NULL,
  `fleet_name` VARCHAR(150) NULL,
  `contact_person` VARCHAR(100) NULL,
  `gst_number` VARCHAR(30) NULL,
  `customer_type` VARCHAR(50) NULL,
  `fleet_size` INT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` VARCHAR(50) NULL,
  `updated_by` VARCHAR(50) NULL,
  `version` INT NOT NULL DEFAULT 1,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vos_public_id` (`public_id`),
  UNIQUE KEY `uq_vos_number` (`vos_number`),
  KEY `idx_vos_branch_state` (`branch_id`, `current_state`),
  KEY `idx_vos_company_dealer` (`company_id`, `dealer_id`),
  KEY `idx_vos_vehicle` (`vehicle_id`),
  KEY `idx_vos_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. State Transition Audit History Table
CREATE TABLE IF NOT EXISTS `vos_state_history` (
  `id` VARCHAR(36) NOT NULL,
  `public_id` VARCHAR(100) NOT NULL,
  `vos_id` VARCHAR(36) NOT NULL,
  `from_state` VARCHAR(50) NOT NULL,
  `to_state` VARCHAR(50) NOT NULL,
  `time_spent_seconds` INT NULL,
  `changed_by` VARCHAR(50) NOT NULL,
  `changed_by_role` VARCHAR(50) NOT NULL,
  `transition_reason` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vos_state_hist_public_id` (`public_id`),
  KEY `idx_vos_state_hist_vos` (`vos_id`, `created_at`),
  CONSTRAINT `fk_vos_state_hist_vos` FOREIGN KEY (`vos_id`) REFERENCES `vos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Ownership Handover Log Table
CREATE TABLE IF NOT EXISTS `vos_owner_history` (
  `id` VARCHAR(36) NOT NULL,
  `public_id` VARCHAR(100) NOT NULL,
  `vos_id` VARCHAR(36) NOT NULL,
  `previous_owner` VARCHAR(50) NOT NULL,
  `previous_owner_role` VARCHAR(50) NOT NULL,
  `new_owner` VARCHAR(50) NOT NULL,
  `new_owner_role` VARCHAR(50) NOT NULL,
  `handover_type` VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  `transferred_by` VARCHAR(50) NOT NULL,
  `handover_notes` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vos_owner_hist_public_id` (`public_id`),
  KEY `idx_vos_owner_hist_vos` (`vos_id`, `created_at`),
  CONSTRAINT `fk_vos_owner_hist_vos` FOREIGN KEY (`vos_id`) REFERENCES `vos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Milestones & Timeline Table
CREATE TABLE IF NOT EXISTS `vos_timeline` (
  `id` VARCHAR(36) NOT NULL,
  `public_id` VARCHAR(100) NOT NULL,
  `vos_id` VARCHAR(36) NOT NULL,
  `timeline_category` VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL',
  `event_type` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `structured_metadata_json` TEXT NULL,
  `recorded_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `sla_status` VARCHAR(20) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vos_timeline_public_id` (`public_id`),
  KEY `idx_vos_timeline_cat` (`vos_id`, `timeline_category`, `recorded_at`),
  CONSTRAINT `fk_vos_timeline_vos` FOREIGN KEY (`vos_id`) REFERENCES `vos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Branch Configuration Reference Snapshot Table
CREATE TABLE IF NOT EXISTS `vos_configuration_reference` (
  `id` VARCHAR(36) NOT NULL,
  `public_id` VARCHAR(100) NOT NULL,
  `vos_id` VARCHAR(36) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `config_version` VARCHAR(50) NOT NULL,
  `workflow_version` VARCHAR(50) NOT NULL,
  `business_rule_version` VARCHAR(50) NOT NULL,
  `ruleset_snapshot_json` TEXT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vos_cfg_ref_public_id` (`public_id`),
  KEY `idx_vos_cfg_ref_vos` (`vos_id`, `branch_id`),
  CONSTRAINT `fk_vos_cfg_ref_vos` FOREIGN KEY (`vos_id`) REFERENCES `vos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Generic Module Relationship Linkage Table
CREATE TABLE IF NOT EXISTS `vos_links` (
  `id` VARCHAR(36) NOT NULL,
  `public_id` VARCHAR(100) NOT NULL,
  `vos_id` VARCHAR(36) NOT NULL,
  `entity_module` VARCHAR(50) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(100) NOT NULL,
  `relationship_type` VARCHAR(50) NOT NULL DEFAULT 'PRIMARY',
  `linked_by` VARCHAR(50) NOT NULL,
  `linked_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vos_links_public_id` (`public_id`),
  KEY `idx_vos_links_vos_entity` (`vos_id`, `entity_module`, `entity_type`, `entity_id`),
  CONSTRAINT `fk_vos_links_vos` FOREIGN KEY (`vos_id`) REFERENCES `vos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Telemetry & Extensible Attributes Table
CREATE TABLE IF NOT EXISTS `vos_attributes` (
  `id` VARCHAR(36) NOT NULL,
  `public_id` VARCHAR(100) NOT NULL,
  `vos_id` VARCHAR(36) NOT NULL,
  `attribute_name` VARCHAR(100) NOT NULL,
  `attribute_value` TEXT NOT NULL,
  `attribute_type` VARCHAR(50) NOT NULL DEFAULT 'STRING',
  `unit` VARCHAR(30) NULL,
  `confidence_score` FLOAT NULL,
  `source` VARCHAR(50) NOT NULL DEFAULT 'GATE_IN',
  `captured_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(50) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vos_attr_public_id` (`public_id`),
  KEY `idx_vos_attr_name` (`vos_id`, `attribute_name`),
  CONSTRAINT `fk_vos_attr_vos` FOREIGN KEY (`vos_id`) REFERENCES `vos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Operational Tagging & Categorization Table
CREATE TABLE IF NOT EXISTS `vos_tags` (
  `id` VARCHAR(36) NOT NULL,
  `public_id` VARCHAR(100) NOT NULL,
  `vos_id` VARCHAR(36) NOT NULL,
  `tag_name` VARCHAR(100) NOT NULL,
  `tag_category` VARCHAR(50) NOT NULL,
  `created_by` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vos_tags_public_id` (`public_id`),
  KEY `idx_vos_tags_cat` (`vos_id`, `tag_category`, `tag_name`),
  CONSTRAINT `fk_vos_tags_vos` FOREIGN KEY (`vos_id`) REFERENCES `vos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
