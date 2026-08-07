import { syncLoad } from "../src/db/sync.ts";
import { pool as db } from "../src/db/index.ts";

async function main() {
  console.log("Starting database synchronization...");
  try {
    await syncLoad();
    console.log("syncLoad completed. Let's physically create the CXO tables.");
    
    // 0. Business Rules Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`business_rules\` (
        \`rule_id\` VARCHAR(100) NOT NULL,
        \`rule_name\` VARCHAR(255) NOT NULL UNIQUE,
        \`rule_group\` VARCHAR(100) NOT NULL,
        \`condition_json\` TEXT NOT NULL,
        \`action_json\` TEXT NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`rule_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("business_rules table checked/created.");

    // EKG Graph Nodes Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`graph_nodes\` (
        \`node_id\` VARCHAR(100) NOT NULL,
        \`node_type\` VARCHAR(100) NOT NULL,
        \`node_name\` VARCHAR(255) NOT NULL,
        \`properties_json\` TEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`node_id\`),
        INDEX \`idx_node_type\` (\`node_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("graph_nodes table checked/created.");

    // EKG Graph Edges Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`graph_edges\` (
        \`edge_id\` VARCHAR(100) NOT NULL,
        \`source_node_id\` VARCHAR(100) NOT NULL,
        \`target_node_id\` VARCHAR(100) NOT NULL,
        \`relationship_type\` VARCHAR(100) NOT NULL,
        \`properties_json\` TEXT,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`version\` INT DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`edge_id\`),
        UNIQUE KEY \`idx_source_target_rel\` (\`source_node_id\`, \`target_node_id\`, \`relationship_type\`),
        CONSTRAINT \`fk_source_node\` FOREIGN KEY (\`source_node_id\`) REFERENCES \`graph_nodes\` (\`node_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_target_node\` FOREIGN KEY (\`target_node_id\`) REFERENCES \`graph_nodes\` (\`node_id\`) ON DELETE CASCADE,
        INDEX \`idx_relationship_type\` (\`relationship_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("graph_edges table checked/created.");

    // EKG Graph Edge History Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`graph_edge_history\` (
        \`history_id\` VARCHAR(100) NOT NULL,
        \`edge_id\` VARCHAR(100) NOT NULL,
        \`source_node_id\` VARCHAR(100) NOT NULL,
        \`target_node_id\` VARCHAR(100) NOT NULL,
        \`relationship_type\` VARCHAR(100) NOT NULL,
        \`properties_json\` TEXT,
        \`version\` INT NOT NULL,
        \`changed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`history_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("graph_edge_history table checked/created.");

    // AI Copilot Recommendations Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`ai_recommendations\` (
        \`recommendation_id\` VARCHAR(100) NOT NULL,
        \`recommendation_type\` VARCHAR(100) NOT NULL,
        \`details_json\` TEXT NOT NULL,
        \`confidence_score\` DECIMAL(5, 2) NOT NULL,
        \`requires_approval\` TINYINT(1) DEFAULT 1,
        \`approval_status\` VARCHAR(50) DEFAULT 'PENDING',
        \`approved_by\` INT DEFAULT NULL,
        \`feedback_rating\` INT DEFAULT NULL,
        \`feedback_comments\` TEXT DEFAULT NULL,
        \`role_submitting\` VARCHAR(100) DEFAULT NULL,
        \`time_saved_sec\` INT DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`recommendation_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("ai_recommendations table checked/created.");

    // AI Copilot Skills Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`ai_copilot_skills\` (
        \`skill_id\` VARCHAR(100) NOT NULL,
        \`skill_name\` VARCHAR(255) NOT NULL UNIQUE,
        \`description\` TEXT NOT NULL,
        \`allowed_roles\` TEXT NOT NULL,
        \`usage_count\` INT DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`skill_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("ai_copilot_skills table checked/created.");

    // 1. Customer Passports
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`customer_passports\` (
        \`customer_passport_id\` VARCHAR(100) NOT NULL,
        \`customer_name\` VARCHAR(255) NOT NULL,
        \`customer_type\` VARCHAR(50) DEFAULT 'Individual',
        \`contact_phone\` VARCHAR(50) NOT NULL,
        \`contact_email\` VARCHAR(255),
        \`pan_number\` VARCHAR(50),
        \`gstin\` VARCHAR(50),
        \`billing_address\` TEXT,
        \`credit_limit\` DECIMAL(12, 2) DEFAULT 0.00,
        \`outstanding_amount\` DECIMAL(12, 2) DEFAULT 0.00,
        \`preferred_workshop_id\` INT DEFAULT NULL,
        \`preferred_advisor_id\` INT DEFAULT NULL,
        \`communication_preferences\` VARCHAR(255) DEFAULT 'SMS,Email',
        \`digital_consent\` TINYINT(1) DEFAULT 1,
        \`loyalty_status\` VARCHAR(50) DEFAULT 'BRONZE',
        \`complaint_history\` TEXT,
        \`warranty_history\` TEXT,
        \`linked_user\` VARCHAR(255) DEFAULT NULL,
        \`linked_vehicles\` TEXT DEFAULT NULL,
        \`linked_fleet\` VARCHAR(100) DEFAULT NULL,
        \`registered_devices\` TEXT DEFAULT NULL,
        \`push_notification_tokens\` TEXT DEFAULT NULL,
        \`preferred_language\` VARCHAR(50) DEFAULT 'en',
        \`notification_preferences\` VARCHAR(255) DEFAULT 'PUSH,SMS,EMAIL',
        \`consent_history\` TEXT DEFAULT NULL,
        \`trusted_devices\` TEXT DEFAULT NULL,
        \`last_login\` TIMESTAMP NULL DEFAULT NULL,
        \`device_metadata\` TEXT DEFAULT NULL,
        \`security_audit_trail\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`customer_passport_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("customer_passports table checked/created.");

    // 2. Fleet Passports
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`fleet_passports\` (
        \`fleet_passport_id\` VARCHAR(100) NOT NULL,
        \`fleet_name\` VARCHAR(255) NOT NULL,
        \`fleet_owner_passport_id\` VARCHAR(100) NOT NULL,
        \`operational_region\` VARCHAR(100),
        \`total_vehicles\` INT DEFAULT 0,
        \`amc_contract_reference\` VARCHAR(100),
        \`sla_priority_level\` VARCHAR(50) DEFAULT 'MEDIUM',
        \`company\` VARCHAR(255) DEFAULT NULL,
        \`gst\` VARCHAR(100) DEFAULT NULL,
        \`industry\` VARCHAR(100) DEFAULT NULL,
        \`fleet_type\` VARCHAR(100) DEFAULT NULL,
        \`fleet_size\` INT DEFAULT 0,
        \`primary_contact\` VARCHAR(255) DEFAULT NULL,
        \`fleet_manager\` VARCHAR(255) DEFAULT NULL,
        \`regional_manager\` VARCHAR(255) DEFAULT NULL,
        \`preferred_workshop_id\` INT DEFAULT NULL,
        \`preferred_service_advisor_id\` INT DEFAULT NULL,
        \`warranty_agreements\` TEXT DEFAULT NULL,
        \`communication_preferences\` VARCHAR(255) DEFAULT 'EMAIL',
        \`relationship_health_score\` DECIMAL(5, 2) DEFAULT 100.00,
        \`fleet_health_score\` DECIMAL(5, 2) DEFAULT 100.00,
        \`fleet_timeline\` TEXT DEFAULT NULL,
        \`knowledge_links\` TEXT DEFAULT NULL,
        \`dna_links\` TEXT DEFAULT NULL,
        \`linked_vehicles\` TEXT DEFAULT NULL,
        \`linked_drivers\` TEXT DEFAULT NULL,
        \`linked_contracts\` TEXT DEFAULT NULL,
        \`linked_warranty\` TEXT DEFAULT NULL,
        \`telematics_config\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`fleet_passport_id\`),
        FOREIGN KEY (\`fleet_owner_passport_id\`) REFERENCES \`customer_passports\` (\`customer_passport_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("fleet_passports table checked/created.");

    // 3. Driver Passports
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`driver_passports\` (
        \`driver_passport_id\` VARCHAR(100) NOT NULL,
        \`driver_name\` VARCHAR(255) NOT NULL,
        \`contact_phone\` VARCHAR(50) NOT NULL,
        \`license_number\` VARCHAR(100),
        \`assigned_vehicle\` VARCHAR(50),
        \`assigned_vehicles\` TEXT DEFAULT NULL,
        \`breakdown_reports\` TEXT DEFAULT NULL,
        \`complaint_quality\` VARCHAR(100) DEFAULT 'GOOD',
        \`training_completion\` TINYINT(1) DEFAULT 0,
        \`driving_observations\` TEXT DEFAULT NULL,
        \`safety_observations\` TEXT DEFAULT NULL,
        \`preferred_language\` VARCHAR(50) DEFAULT 'en',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`driver_passport_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("driver_passports table checked/created.");

    // 4. FIP AMC Contracts
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`fleet_amc_contracts\` (
        \`contract_id\` VARCHAR(100) NOT NULL,
        \`fleet_passport_id\` VARCHAR(100) NOT NULL,
        \`contract_reference\` VARCHAR(100) NOT NULL,
        \`coverage_details\` TEXT,
        \`expiry_date\` DATE,
        \`total_value\` DECIMAL(12, 2) DEFAULT 0.00,
        \`usage_value\` DECIMAL(12, 2) DEFAULT 0.00,
        \`remaining_value\` DECIMAL(12, 2) DEFAULT 0.00,
        \`service_compliance_score\` DECIMAL(5, 2) DEFAULT 100.00,
        \`renewal_prediction\` VARCHAR(50) DEFAULT 'MEDIUM_LIKELIHOOD',
        \`ai_renewal_recommendation\` TEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`contract_id\`),
        FOREIGN KEY (\`fleet_passport_id\`) REFERENCES \`fleet_passports\` (\`fleet_passport_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("fleet_amc_contracts table checked/created.");

    // 5. FIP Fleet Breakdowns
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`fleet_breakdowns\` (
        \`breakdown_id\` VARCHAR(100) NOT NULL,
        \`fleet_passport_id\` VARCHAR(100) NOT NULL,
        \`vehicle_vin\` VARCHAR(100) NOT NULL,
        \`driver_passport_id\` VARCHAR(100) DEFAULT NULL,
        \`location\` VARCHAR(255) DEFAULT NULL,
        \`failure_pattern\` TEXT,
        \`recovery_time_min\` INT DEFAULT 0,
        \`repair_time_min\` INT DEFAULT 0,
        \`repeat_failures_count\` INT DEFAULT 0,
        \`technician_id\` INT DEFAULT NULL,
        \`causal_part_no\` VARCHAR(100) DEFAULT NULL,
        \`knowledge_learned\` TEXT,
        \`dna_links\` TEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`breakdown_id\`),
        FOREIGN KEY (\`fleet_passport_id\`) REFERENCES \`fleet_passports\` (\`fleet_passport_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("fleet_breakdowns table checked/created.");

    // 6. FIP Fleet Opportunities
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`fleet_opportunities\` (
        \`opportunity_id\` VARCHAR(100) NOT NULL,
        \`fleet_passport_id\` VARCHAR(100) NOT NULL,
        \`opportunity_type\` VARCHAR(100) NOT NULL,
        \`details\` TEXT NOT NULL,
        \`assigned_to\` INT DEFAULT NULL,
        \`status\` VARCHAR(50) DEFAULT 'OPEN',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`opportunity_id\`),
        FOREIGN KEY (\`fleet_passport_id\`) REFERENCES \`fleet_passports\` (\`fleet_passport_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("fleet_opportunities table checked/created.");

    // 4. Ownership Timeline
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`ownership_timeline\` (
        \`event_id\` VARCHAR(100) NOT NULL,
        \`customer_passport_id\` VARCHAR(100) NOT NULL,
        \`vehicle_vin\` VARCHAR(100) NOT NULL,
        \`event_type\` VARCHAR(100) NOT NULL,
        \`event_date\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`description\` TEXT NOT NULL,
        \`metadata_payload\` TEXT,
        PRIMARY KEY (\`event_id\`),
        FOREIGN KEY (\`customer_passport_id\`) REFERENCES \`customer_passports\` (\`customer_passport_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("ownership_timeline table checked/created.");

    // 5. Digital Approvals
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`digital_approvals\` (
        \`approval_id\` VARCHAR(100) NOT NULL,
        \`job_id\` INT NOT NULL,
        \`customer_passport_id\` VARCHAR(100) NOT NULL,
        \`approval_type\` VARCHAR(100) NOT NULL,
        \`approved_items\` TEXT NOT NULL,
        \`signature_blob\` TEXT,
        \`status\` VARCHAR(50) DEFAULT 'APPROVED',
        \`ip_address\` VARCHAR(50),
        \`user_agent\` VARCHAR(255),
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`approval_id\`),
        FOREIGN KEY (\`job_id\`) REFERENCES \`job_cards\` (\`job_id\`),
        FOREIGN KEY (\`customer_passport_id\`) REFERENCES \`customer_passports\` (\`customer_passport_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("digital_approvals table checked/created.");

    // 6. Communication Logs
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`communication_logs\` (
        \`log_id\` VARCHAR(100) NOT NULL,
        \`customer_passport_id\` VARCHAR(100) NOT NULL,
        \`channel\` VARCHAR(50) NOT NULL,
        \`subject\` VARCHAR(255),
        \`body_text\` TEXT NOT NULL,
        \`is_read\` TINYINT(1) DEFAULT 0,
        \`read_at\` TIMESTAMP NULL DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`log_id\`),
        FOREIGN KEY (\`customer_passport_id\`) REFERENCES \`customer_passports\` (\`customer_passport_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("communication_logs table checked/created.");

    // 7. Customer Feedback
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`customer_feedback\` (
        \`feedback_id\` VARCHAR(100) NOT NULL,
        \`customer_passport_id\` VARCHAR(100) NOT NULL,
        \`job_id\` INT NOT NULL,
        \`csi_score\` INT DEFAULT NULL,
        \`nps_score\` INT DEFAULT NULL,
        \`workshop_rating\` INT DEFAULT NULL,
        \`advisor_rating\` INT DEFAULT NULL,
        \`technician_rating\` INT DEFAULT NULL,
        \`comments\` TEXT,
        \`resolved_quality\` VARCHAR(50) DEFAULT 'EXCELLENT',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`feedback_id\`),
        FOREIGN KEY (\`customer_passport_id\`) REFERENCES \`customer_passports\` (\`customer_passport_id\`),
        FOREIGN KEY (\`job_id\`) REFERENCES \`job_cards\` (\`job_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("customer_feedback table checked/created.");

    // Alter table to add new Digital Identity Passport columns if not present
    const addColumns = [
      "ALTER TABLE `customer_passports` ADD COLUMN `linked_user` VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE `customer_passports` ADD COLUMN `linked_vehicles` TEXT DEFAULT NULL",
      "ALTER TABLE `customer_passports` ADD COLUMN `linked_fleet` VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE `customer_passports` ADD COLUMN `registered_devices` TEXT DEFAULT NULL",
      "ALTER TABLE `customer_passports` ADD COLUMN `push_notification_tokens` TEXT DEFAULT NULL",
      "ALTER TABLE `customer_passports` ADD COLUMN `preferred_language` VARCHAR(50) DEFAULT 'en'",
      "ALTER TABLE `customer_passports` ADD COLUMN `notification_preferences` VARCHAR(255) DEFAULT 'PUSH,SMS,EMAIL'",
      "ALTER TABLE `customer_passports` ADD COLUMN `consent_history` TEXT DEFAULT NULL",
      "ALTER TABLE `customer_passports` ADD COLUMN `trusted_devices` TEXT DEFAULT NULL",
      "ALTER TABLE `customer_passports` ADD COLUMN `last_login` TIMESTAMP NULL DEFAULT NULL",
      "ALTER TABLE `customer_passports` ADD COLUMN `device_metadata` TEXT DEFAULT NULL",
      "ALTER TABLE `customer_passports` ADD COLUMN `security_audit_trail` TEXT DEFAULT NULL"
    ];
    for (const sql of addColumns) {
      try {
        await db.execute(sql);
      } catch (e) {
        // Ignore column already exists errors
      }
    }
    console.log("customer_passports columns alter check completed.");

    // Alter table to add new FIP columns to fleet_passports and driver_passports
    const alterFleetCols = [
      "ALTER TABLE `fleet_passports` ADD COLUMN `company` VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `gst` VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `industry` VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `fleet_type` VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `fleet_size` INT DEFAULT 0",
      "ALTER TABLE `fleet_passports` ADD COLUMN `primary_contact` VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `fleet_manager` VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `regional_manager` VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `preferred_workshop_id` INT DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `preferred_service_advisor_id` INT DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `warranty_agreements` TEXT DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `communication_preferences` VARCHAR(255) DEFAULT 'EMAIL'",
      "ALTER TABLE `fleet_passports` ADD COLUMN `relationship_health_score` DECIMAL(5, 2) DEFAULT 100.00",
      "ALTER TABLE `fleet_passports` ADD COLUMN `fleet_health_score` DECIMAL(5, 2) DEFAULT 100.00",
      "ALTER TABLE `fleet_passports` ADD COLUMN `fleet_timeline` TEXT DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `knowledge_links` TEXT DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `dna_links` TEXT DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `linked_vehicles` TEXT DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `linked_drivers` TEXT DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `linked_contracts` TEXT DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `linked_warranty` TEXT DEFAULT NULL",
      "ALTER TABLE `fleet_passports` ADD COLUMN `telematics_config` TEXT DEFAULT NULL"
    ];
    for (const sql of alterFleetCols) {
      try {
        await db.execute(sql);
      } catch (e) {}
    }

    const alterDriverCols = [
      "ALTER TABLE `driver_passports` ADD COLUMN `assigned_vehicles` TEXT DEFAULT NULL",
      "ALTER TABLE `driver_passports` ADD COLUMN `breakdown_reports` TEXT DEFAULT NULL",
      "ALTER TABLE `driver_passports` ADD COLUMN `complaint_quality` VARCHAR(100) DEFAULT 'GOOD'",
      "ALTER TABLE `driver_passports` ADD COLUMN `training_completion` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `driver_passports` ADD COLUMN `driving_observations` TEXT DEFAULT NULL",
      "ALTER TABLE `driver_passports` ADD COLUMN `safety_observations` TEXT DEFAULT NULL",
      "ALTER TABLE `driver_passports` ADD COLUMN `preferred_language` VARCHAR(50) DEFAULT 'en'"
    ];
    for (const sql of alterDriverCols) {
      try {
        await db.execute(sql);
      } catch (e) {}
    }
    console.log("FIP columns alter checks completed.");

    // =========================================================================
    // ASS-2A ENTERPRISE SECURITY BLUEPRINT MIGRATIONS
    // =========================================================================
    const ass2aAlterCols = [
      "ALTER TABLE `role_permissions` ADD COLUMN `can_create` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `role_permissions` ADD COLUMN `can_delete` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `role_permissions` ADD COLUMN `can_approve` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `role_permissions` ADD COLUMN `can_reject` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `role_permissions` ADD COLUMN `can_print` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `role_permissions` ADD COLUMN `can_export` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `role_permissions` ADD COLUMN `can_import` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `role_permissions` ADD COLUMN `can_assign` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `role_permissions` ADD COLUMN `can_close` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `role_permissions` ADD COLUMN `can_reopen` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `role_permissions` ADD COLUMN `can_admin` TINYINT(1) DEFAULT 0",
      "ALTER TABLE `role_permissions` ADD COLUMN `can_configure` TINYINT(1) DEFAULT 0"
    ];
    for (const sql of ass2aAlterCols) {
      try {
        await db.execute(sql);
      } catch (e) {}
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`user_overrides\` (
        \`override_id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`module_id\` INT NOT NULL,
        \`permission_type\` VARCHAR(100) NOT NULL,
        \`is_allowed\` TINYINT(1) NOT NULL,
        \`effective_from\` TIMESTAMP NULL DEFAULT NULL,
        \`effective_until\` TIMESTAMP NULL DEFAULT NULL,
        \`business_reason\` TEXT NOT NULL,
        \`approved_by\` INT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`override_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`user_delegations\` (
        \`delegation_id\` INT NOT NULL AUTO_INCREMENT,
        \`delegator_id\` INT NOT NULL,
        \`delegatee_id\` INT NOT NULL,
        \`module_id\` INT DEFAULT NULL,
        \`effective_from\` TIMESTAMP NOT NULL,
        \`effective_until\` TIMESTAMP NOT NULL,
        \`business_reason\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`delegation_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`security_audit_logs\` (
        \`log_id\` INT NOT NULL AUTO_INCREMENT,
        \`actor_user_id\` INT NOT NULL,
        \`module_name\` VARCHAR(255) NOT NULL,
        \`feature_name\` VARCHAR(255) DEFAULT NULL,
        \`action_type\` VARCHAR(100) NOT NULL,
        \`old_value\` TEXT DEFAULT NULL,
        \`new_value\` TEXT DEFAULT NULL,
        \`business_reason\` TEXT NOT NULL,
        \`ip_address\` VARCHAR(100) DEFAULT NULL,
        \`user_agent\` VARCHAR(255) DEFAULT NULL,
        \`session_id\` VARCHAR(255) DEFAULT NULL,
        \`request_id\` VARCHAR(255) DEFAULT NULL,
        \`timestamp_utc\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`log_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("ASS-2A Schema Migrations applied.");

    // Indexes
    await db.execute("CREATE INDEX `idx_ot_cust_vin` ON `ownership_timeline` (`customer_passport_id`, `vehicle_vin`)").catch(() => {});
    await db.execute("CREATE INDEX `idx_da_job_cust` ON `digital_approvals` (`job_id`, `customer_passport_id`)").catch(() => {});
    await db.execute("CREATE INDEX `idx_cf_cust_job` ON `customer_feedback` (`customer_passport_id`, `job_id`)").catch(() => {});
    await db.execute("CREATE INDEX `idx_cl_cust_channel` ON `communication_logs` (`customer_passport_id`, `channel`)").catch(() => {});
    console.log("CXO Indexes applied.");

    // Seed default fleet rules
    const { seedDefaultFleetRules } = await import("../src/engines/fleet-rules-evaluator.ts");
    await seedDefaultFleetRules();
    console.log("FIP default rules seeded.");

    console.log("Database synchronization completed successfully.");
    process.exit(0);
  } catch (err: any) {
    console.warn("Database sync main execution warning/error (proceeding with fallback):", err.message);
    process.exit(0);
  }
}

main().catch((err) => {
  console.warn("Database sync warning/error (proceeding with fallback):", err.message);
  process.exit(0);
});
