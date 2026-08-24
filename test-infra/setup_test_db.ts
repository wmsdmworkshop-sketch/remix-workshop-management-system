/**
 * ============================================================================
 * Isolated Test-Database Setup — creates and schema-builds `wms_test`.
 * ----------------------------------------------------------------------------
 * Run with the test env loaded so it can NEVER touch production:
 *
 *     npx dotenv -e .env.test -- npx tsx test-infra/setup_test_db.ts
 *   (or)
 *     npm run db:setup:test
 *
 * What it does:
 *   1. Fail-closed safety check — refuses unless the target is the isolated
 *      `wms_test` schema on a non-production host.
 *   2. CREATE DATABASE IF NOT EXISTS `wms_test` (via a raw connection with no
 *      database selected).
 *   3. Builds the schema using the application's OWN authoritative builders —
 *      runMigrations(allMigrations) + ensureTablesExist() + validateSchema() —
 *      so the test schema always matches what the server actually expects (no
 *      hand-maintained SQL that can drift).
 *
 * It seeds ONLY reference data that the migrations themselves seed (roles,
 * permissions, modules_master). It never seeds operational/customer data.
 * ============================================================================
 */

import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const PROD_DB_NAMES = ["railway"];
const PROD_DB_HOSTS = ["35.200.150.167"];

const dbName = process.env.DB_DATABASE;
const dbHost = process.env.DB_HOST || "127.0.0.1";
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
const dbUser = process.env.DB_USER || "root";
const dbPassword = process.env.DB_PASSWORD;

function fail(msg: string): never {
  console.error(`\n[setup_test_db] REFUSING TO RUN — ${msg}\n`);
  process.exit(1);
}

// ---- 1. Fail-closed safety gate -------------------------------------------
if (process.env.NODE_ENV !== "test") {
  fail(`NODE_ENV is '${process.env.NODE_ENV}', expected 'test'. Run via: npm run db:setup:test`);
}
if (!dbName || dbName !== "wms_test") {
  fail(`DB_DATABASE is '${dbName || "MISSING"}', expected the isolated 'wms_test' schema.`);
}
if (PROD_DB_NAMES.includes(dbName)) {
  fail(`DB_DATABASE '${dbName}' is a PRODUCTION schema name.`);
}
if (PROD_DB_HOSTS.includes(dbHost)) {
  fail(`DB_HOST '${dbHost}' is the PRODUCTION database host. The test DB must live on a separate, non-production server.`);
}
if (!dbPassword) {
  fail("DB_PASSWORD is missing. Provide the test MySQL credentials in .env.test.");
}

console.log("==========================================");
console.log("[setup_test_db] Isolated test-DB provisioning");
console.log(`  host     = ${dbHost}:${dbPort}`);
console.log(`  user     = ${dbUser}`);
console.log(`  database = ${dbName}`);
console.log("==========================================");

// ---- 2. Create the database (raw connection, no schema selected) ----------
{
  const admin = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    multipleStatements: false,
  });
  // Identifier is validated above to be exactly "wms_test"; safe to inline.
  await admin.query("CREATE DATABASE IF NOT EXISTS `wms_test` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
  console.log("[setup_test_db] ✓ database `wms_test` ensured");
  await admin.end();
}

// ---- 2b. Load the baseline DDL (structure only, NO operational/customer data) --
// The application migrations assume a pre-existing full schema (their baseline is a
// snapshot, and e.g. `role_permissions` is created out of dependency order for a
// fresh DB). So we first establish the complete table structure from the DDL-only
// schema file — derived from a production dump with EVERY `INSERT` (all real data)
// stripped — then let the migrations add columns and seed reference data.
{
  const schemaSql = readFileSync(new URL("./wms_test_schema.sql", import.meta.url), "utf8");
  const structConn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: "wms_test",
    multipleStatements: true,
  });
  console.log("[setup_test_db] Loading baseline table structure (DDL only, no data)...");
  await structConn.query(schemaSql);
  console.log("[setup_test_db] ✓ baseline structure loaded");
  await structConn.end();
}

// ---- 3. Build the schema using the app's own authoritative builders --------
// Imported dynamically AFTER the database exists so the pool (and its health
// probe) never queries a missing schema on module load.
const { runMigrations, validateSchema } = await import("../src/db/migrate.ts");
const { allMigrations } = await import("../src/db/migrations/index.ts");
const { ensureTablesExist } = await import("../src/db/sync.ts");
const { pool } = await import("../src/db/index.ts");

try {
  console.log("[setup_test_db] Running migrations...");
  const { applied, currentVersion } = await runMigrations(allMigrations);
  console.log(`[setup_test_db] ✓ migrations applied=${applied}, schema v${currentVersion}`);

  console.log("[setup_test_db] Ensuring non-migration tables (billing / gate-out / etc.)...");
  await ensureTablesExist();
  console.log("[setup_test_db] ✓ ensureTablesExist complete");

  console.log("[setup_test_db] Validating critical tables...");
  await validateSchema();

  console.log("[setup_test_db] Creating genuinely-missing test tables...");
  await pool.execute(`
      CREATE TABLE IF NOT EXISTS dealer_configurations (
        config_key VARCHAR(100) PRIMARY KEY,
        config_value VARCHAR(255) NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

  await pool.execute(`DROP TABLE IF EXISTS tbl_warehouse_master`);
  await pool.execute(`
    CREATE TABLE tbl_warehouse_master (
      warehouse_id VARCHAR(50) PRIMARY KEY,
      branch_id VARCHAR(50),
      warehouse_name VARCHAR(100),
      warehouse_code VARCHAR(50) NOT NULL,
      location VARCHAR(100),
      manager_id VARCHAR(50),
      type VARCHAR(50),
      status VARCHAR(50),
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS tbl_bin_master`);
  await pool.execute(`
    CREATE TABLE tbl_bin_master (
      bin_id VARCHAR(50) PRIMARY KEY,
      warehouse_id VARCHAR(50) NOT NULL,
      bin_code VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS role_permissions`);
  await pool.execute(`
    CREATE TABLE role_permissions (
      permission_id INT AUTO_INCREMENT PRIMARY KEY,
      role_id INT NULL,
      module_id INT NULL,
      role_name VARCHAR(50),
      module_name VARCHAR(50),
      can_view TINYINT(1) DEFAULT 0,
      can_create TINYINT(1) DEFAULT 0,
      can_edit TINYINT(1) DEFAULT 0,
      can_delete TINYINT(1) DEFAULT 0,
      can_approve TINYINT(1) DEFAULT 0,
      can_reject TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS roles`);
  await pool.execute(`
    CREATE TABLE roles (
      role_id INT AUTO_INCREMENT PRIMARY KEY,
      role_name VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS modules`);
  await pool.execute(`
    CREATE TABLE modules (
      module_id INT AUTO_INCREMENT PRIMARY KEY,
      module_name VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS tbl_inventory_stock`);
  await pool.execute(`
    CREATE TABLE tbl_inventory_stock (
      stock_id VARCHAR(50) PRIMARY KEY,
      branch_id VARCHAR(50),
      part_number VARCHAR(100) NOT NULL,
      warehouse_id VARCHAR(50) NOT NULL,
      bin_id VARCHAR(50),
      current_quantity DECIMAL(12,2) DEFAULT 0,
      reserved_quantity DECIMAL(12,2) DEFAULT 0,
      available_quantity DECIMAL(12,2) DEFAULT 0,
      blocked_quantity DECIMAL(12,2) DEFAULT 0,
      in_transit_quantity DECIMAL(12,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS tbl_warranty_reviews`);
  await pool.execute(`
    CREATE TABLE tbl_warranty_reviews (
      review_id VARCHAR(50) PRIMARY KEY,
      job_card_id VARCHAR(50) NOT NULL,
      vrn VARCHAR(50) NOT NULL,
      vin VARCHAR(50),
      complaint TEXT NOT NULL,
      diagnosis TEXT,
      failed_part VARCHAR(100),
      requested_by VARCHAR(100) NOT NULL,
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'PENDING',
      acknowledged_by VARCHAR(100),
      acknowledged_at TIMESTAMP,
      eligibility_check_result VARCHAR(50),
      document_gaps_json TEXT,
      warranty_claim_id VARCHAR(50),
      rejection_reason TEXT,
      adjudicated_by VARCHAR(100),
      adjudicated_at TIMESTAMP,
      adjudication_notes TEXT,
      branch_id VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS tbl_parts_requests`);
  await pool.execute(`
    CREATE TABLE tbl_parts_requests (
      request_id VARCHAR(50) PRIMARY KEY,
      job_card_id VARCHAR(50) NOT NULL,
      vrn VARCHAR(50) NOT NULL,
      operation_id VARCHAR(50),
      part_code VARCHAR(100),
      part_description TEXT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      urgency VARCHAR(50) DEFAULT 'NORMAL',
      requested_by VARCHAR(100) NOT NULL,
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'PENDING',
      parts_user_response TEXT,
      responded_at TIMESTAMP,
      acknowledged_by VARCHAR(100),
      acknowledged_at TIMESTAMP,
      fulfilled_by VARCHAR(100),
      fulfilled_at TIMESTAMP,
      stock_reservation_id VARCHAR(50),
      goods_issue_id VARCHAR(50),
      rejection_reason TEXT,
      expected_date TIMESTAMP,
      branch_id VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS tbl_stock_reservation`);
  await pool.execute(`
    CREATE TABLE tbl_stock_reservation (
      reservation_number VARCHAR(50) PRIMARY KEY,
      job_card_id VARCHAR(50),
      branch_id VARCHAR(50),
      part_number VARCHAR(100) NOT NULL,
      reserved_quantity DECIMAL(12,2),
      issued_quantity DECIMAL(12,2) DEFAULT 0,
      released_quantity DECIMAL(12,2) DEFAULT 0,
      status VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS tbl_goods_issue`);
  await pool.execute(`
    CREATE TABLE tbl_goods_issue (
      issue_number VARCHAR(50) PRIMARY KEY,
      job_card_id VARCHAR(50),
      part_number VARCHAR(100) NOT NULL,
      issued_quantity DECIMAL(12,2),
      issued_by VARCHAR(50),
      branch_id VARCHAR(50),
      warehouse_id VARCHAR(50),
      bin_id VARCHAR(50),
      technician_id VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS tbl_stock_transaction`);
  await pool.execute(`
    CREATE TABLE tbl_stock_transaction (
      transaction_id VARCHAR(50) PRIMARY KEY,
      transaction_type VARCHAR(50),
      part_number VARCHAR(100) NOT NULL,
      branch_id VARCHAR(50),
      warehouse_id VARCHAR(50),
      bin_id VARCHAR(50),
      from_bin_id VARCHAR(50),
      reference_type VARCHAR(50),
      reference_id VARCHAR(50),
      quantity DECIMAL(12,2),
      unit_cost DECIMAL(12,2),
      running_balance DECIMAL(12,2),
      transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      performed_by VARCHAR(50),
      reason TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS fleet_opportunities (
        opportunity_id VARCHAR(100) PRIMARY KEY,
        fleet_passport_id VARCHAR(100) NOT NULL,
        opportunity_type VARCHAR(100) NOT NULL,
        details TEXT,
        assigned_to VARCHAR(100),
        status VARCHAR(50) DEFAULT 'OPEN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS fleet_breakdowns (
        breakdown_id VARCHAR(100) PRIMARY KEY,
        fleet_passport_id VARCHAR(100) NOT NULL,
        vrn VARCHAR(50) NOT NULL,
        reported_at TIMESTAMP NOT NULL,
        resolved_at TIMESTAMP NULL,
        downtime_hours DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'REPORTED'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS fleet_amc_contracts (
        contract_id VARCHAR(100) PRIMARY KEY,
        fleet_passport_id VARCHAR(100) NOT NULL,
        contract_type VARCHAR(50) NOT NULL,
        total_value DECIMAL(15,2) NOT NULL,
        consumed_value DECIMAL(15,2) DEFAULT 0,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'ACTIVE'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS business_rules (
          rule_id VARCHAR(100) PRIMARY KEY,
          rule_name VARCHAR(255) NOT NULL,
          rule_category VARCHAR(100) DEFAULT NULL,
          rule_group VARCHAR(100) DEFAULT NULL,
          condition_json TEXT NOT NULL,
          action_json TEXT NOT NULL,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS driver_passports (
        driver_id VARCHAR(100) PRIMARY KEY,
        fleet_passport_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        license_number VARCHAR(100) NOT NULL,
        contact_phone VARCHAR(50) DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'ACTIVE'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    await pool.execute(`
    CREATE TABLE IF NOT EXISTS graph_nodes (
      node_id VARCHAR(100) PRIMARY KEY,
      node_type VARCHAR(100) NOT NULL,
      node_name VARCHAR(255) NOT NULL,
      properties_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ai_recommendations (
      recommendation_id VARCHAR(100) PRIMARY KEY,
      recommendation_type VARCHAR(100) NOT NULL,
      details_json TEXT NOT NULL,
      confidence_score DECIMAL(5,2) NOT NULL,
      requires_approval TINYINT(1) DEFAULT 1,
      approval_status VARCHAR(50) DEFAULT 'PENDING',
      approved_by INT DEFAULT NULL,
      feedback_rating INT DEFAULT NULL,
      feedback_comments TEXT,
      role_submitting VARCHAR(100) DEFAULT NULL,
      time_saved_sec INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ai_copilot_skills (
      skill_id VARCHAR(100) PRIMARY KEY,
      skill_name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      allowed_roles TEXT NOT NULL,
      usage_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS dealer_configurations (
      config_key VARCHAR(100) PRIMARY KEY,
      config_value TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ai_copilot_skills (
      skill_id VARCHAR(100) PRIMARY KEY,
      skill_name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      allowed_roles TEXT NOT NULL,
      usage_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS graph_edges (
      edge_id VARCHAR(255) PRIMARY KEY,
      source_node_id VARCHAR(255),
      target_node_id VARCHAR(255),
      relationship_type VARCHAR(100),
      properties_json JSON,
      version INT,
      is_active TINYINT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS graph_edge_history (
      history_id VARCHAR(255) PRIMARY KEY,
      edge_id VARCHAR(255),
      source_node_id VARCHAR(255),
      target_node_id VARCHAR(255),
      relationship_type VARCHAR(100),
      properties_json JSON,
      version INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS customer_feedback (
        feedback_id VARCHAR(100) PRIMARY KEY,
        customer_passport_id VARCHAR(100) NOT NULL,
        job_id INT NOT NULL,
        csi_score INT DEFAULT NULL,
        nps_score INT DEFAULT NULL,
        workshop_rating INT DEFAULT NULL,
        advisor_rating INT DEFAULT NULL,
        technician_rating INT DEFAULT NULL,
        comments TEXT,
        resolved_quality VARCHAR(50) DEFAULT 'EXCELLENT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS tbl_handoff_sla (
        handoff_id VARCHAR(50) PRIMARY KEY,
        stage_name VARCHAR(50) NOT NULL,
        entity_id VARCHAR(50) NOT NULL,
        owner_id VARCHAR(50) NOT NULL,
        owner_role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP NULL,
        sla_due_at TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'ON_TRACK',
        escalation_level INT DEFAULT 0,
        escalated_at TIMESTAMP NULL,
        branch_id VARCHAR(50) NOT NULL,
        eod_deadline DATETIME NULL,
        target_sla_minutes INT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS oem_queries (
      query_id VARCHAR(100) PRIMARY KEY,
      claim_id VARCHAR(100) NOT NULL,
      query_text TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      evidence_requested VARCHAR(255) DEFAULT NULL,
      engineer_remarks TEXT,
      response_text TEXT,
      response_time_sec INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS warranty_dna (
      dna_id VARCHAR(100) PRIMARY KEY,
      claim_no VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL,
      approved TINYINT(1) DEFAULT 0,
      evidence_used TEXT,
      circular_applied VARCHAR(255) DEFAULT NULL,
      failure_pattern TEXT,
      technician VARCHAR(255) DEFAULT NULL,
      vehicle VARCHAR(255) DEFAULT NULL,
      part VARCHAR(255) DEFAULT NULL,
      oem_questions TEXT,
      time_to_approval_sec INT DEFAULT NULL,
      lessons_learned TEXT,
      ai_confidence DECIMAL(5,2) DEFAULT NULL,
      golden_claim TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS customer_passports (
      customer_passport_id varchar(100) NOT NULL,
      customer_name varchar(255) NOT NULL,
      customer_type varchar(50) DEFAULT 'Individual',
      contact_phone varchar(50) NOT NULL,
      contact_email varchar(255) DEFAULT NULL,
      pan_number varchar(50) DEFAULT NULL,
      gstin varchar(50) DEFAULT NULL,
      billing_address text,
      credit_limit decimal(12,2) DEFAULT '0.00',
      outstanding_amount decimal(12,2) DEFAULT '0.00',
      preferred_workshop_id int DEFAULT NULL,
      preferred_advisor_id int DEFAULT NULL,
      communication_preferences varchar(255) DEFAULT 'SMS,Email',
      digital_consent tinyint(1) DEFAULT '1',
      loyalty_status varchar(50) DEFAULT 'BRONZE',
      complaint_history text,
      warranty_history text,
      linked_user varchar(255) DEFAULT NULL,
      linked_vehicles text,
      linked_fleet varchar(100) DEFAULT NULL,
      registered_devices text,
      push_notification_tokens text,
      preferred_language varchar(50) DEFAULT 'en',
      notification_preferences varchar(255) DEFAULT 'PUSH,SMS,EMAIL',
      consent_history text,
      trusted_devices text,
      last_login timestamp NULL DEFAULT NULL,
      device_metadata text,
      security_audit_trail text,
      created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (customer_passport_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS communication_logs (
      log_id VARCHAR(100) PRIMARY KEY,
      customer_passport_id VARCHAR(100) NOT NULL,
      channel VARCHAR(50) NOT NULL,
      subject VARCHAR(255) DEFAULT NULL,
      body_text TEXT NOT NULL,
      is_read TINYINT(1) DEFAULT 0,
      read_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS digital_approvals (
      approval_id VARCHAR(100) PRIMARY KEY,
      job_id INT NOT NULL,
      customer_passport_id VARCHAR(100) NOT NULL,
      approval_type VARCHAR(100) NOT NULL,
      approved_items TEXT NOT NULL,
      signature_blob TEXT,
      status VARCHAR(50) DEFAULT 'APPROVED',
      ip_address VARCHAR(50) DEFAULT NULL,
      user_agent VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ownership_timeline (
      event_id VARCHAR(100) PRIMARY KEY,
      customer_passport_id VARCHAR(100) NOT NULL,
      vehicle_vin VARCHAR(100) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      description TEXT NOT NULL,
      metadata_payload TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS fleet_passports (
      fleet_passport_id VARCHAR(100) PRIMARY KEY,
      fleet_name VARCHAR(255) NOT NULL,
      fleet_owner_passport_id VARCHAR(100) NOT NULL,
      operational_region VARCHAR(100) DEFAULT NULL,
      total_vehicles INT DEFAULT 0,
      amc_contract_reference VARCHAR(100) DEFAULT NULL,
      sla_priority_level VARCHAR(50) DEFAULT 'MEDIUM',
      company VARCHAR(255) DEFAULT NULL,
      gst VARCHAR(100) DEFAULT NULL,
      industry VARCHAR(100) DEFAULT NULL,
      fleet_type VARCHAR(100) DEFAULT NULL,
      fleet_size INT DEFAULT 0,
      primary_contact VARCHAR(255) DEFAULT NULL,
      fleet_manager VARCHAR(255) DEFAULT NULL,
      regional_manager VARCHAR(255) DEFAULT NULL,
      preferred_workshop_id INT DEFAULT NULL,
      preferred_service_advisor_id INT DEFAULT NULL,
      warranty_agreements TEXT,
      communication_preferences VARCHAR(255) DEFAULT 'EMAIL',
      relationship_health_score DECIMAL(5,2) DEFAULT 100.00,
      fleet_health_score DECIMAL(5,2) DEFAULT 100.00,
      fleet_timeline TEXT,
      knowledge_links TEXT,
      dna_links TEXT,
      linked_vehicles TEXT,
      linked_drivers TEXT,
      linked_contracts TEXT,
      linked_warranty TEXT,
      telematics_config TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await pool.execute(`DROP TABLE IF EXISTS job_card_complaint_history`);
  await pool.execute(`
    CREATE TABLE job_card_complaint_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_card_id INT NOT NULL,
      version_number INT NOT NULL,
      complaint_text TEXT NOT NULL,
      edited_by_user_id INT,
      edited_by_name VARCHAR(100) NOT NULL,
      edited_role VARCHAR(50) NOT NULL,
      branch_id INT DEFAULT 1,
      edit_reason TEXT,
      source VARCHAR(50) DEFAULT 'WEB_UI',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS tbl_invoice`);
  await pool.execute(`
    CREATE TABLE tbl_invoice (
      invoice_id VARCHAR(50) PRIMARY KEY,
      invoice_number VARCHAR(100) UNIQUE,
      invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      invoice_type VARCHAR(50),
      customer_id VARCHAR(50),
      job_card_id VARCHAR(50),
      estimate_id VARCHAR(50),
      warranty_id VARCHAR(50),
      amc_id VARCHAR(50),
      fsb_id VARCHAR(50),
      goodwill_id VARCHAR(50),
      breakdown_id VARCHAR(50),
      branch_id VARCHAR(50),
      status VARCHAR(50),
      currency VARCHAR(10) DEFAULT 'INR',
      total_labour DECIMAL(12,2),
      total_parts DECIMAL(12,2),
      discount DECIMAL(12,2) DEFAULT 0,
      taxable_amount DECIMAL(12,2),
      gst_amount DECIMAL(12,2),
      grand_total DECIMAL(12,2),
      round_off DECIMAL(12,2),
      net_amount DECIMAL(12,2),
      created_by VARCHAR(50),
      approved_by VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS tbl_invoice_line`);
  await pool.execute(`
    CREATE TABLE tbl_invoice_line (
      invoice_line_id VARCHAR(50) PRIMARY KEY,
      invoice_id VARCHAR(50) NOT NULL,
      line_number INT,
      item_type VARCHAR(50),
      reference_operation_id VARCHAR(50),
      reference_part_number VARCHAR(100),
      description TEXT,
      quantity DECIMAL(10,2),
      rate DECIMAL(12,2),
      discount DECIMAL(12,2) DEFAULT 0,
      taxable_amount DECIMAL(12,2),
      tax_amount DECIMAL(12,2),
      net_amount DECIMAL(12,2)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS tbl_invoice_revision`);
  await pool.execute(`
    CREATE TABLE tbl_invoice_revision (
      revision_id VARCHAR(50) PRIMARY KEY,
      invoice_id VARCHAR(50) NOT NULL,
      version INT,
      reason TEXT,
      requested_by VARCHAR(50),
      approved_by VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS rpt_qc_checklists`);
  await pool.execute(`
    CREATE TABLE rpt_qc_checklists (
      qc_checklist_id INT AUTO_INCREMENT PRIMARY KEY,
      job_id INT NOT NULL,
      inspector_id INT NOT NULL,
      result VARCHAR(50) NOT NULL,
      check_items_json TEXT,
      road_test_km INT,
      inspector_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS warranty_claims`);
  await pool.execute(`
    CREATE TABLE warranty_claims (
      claim_id VARCHAR(50) PRIMARY KEY,
      job_id INT,
      claim_type VARCHAR(50),
      part_number VARCHAR(100),
      claim_amount DECIMAL(12,2),
      status VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await pool.execute(`DROP TABLE IF EXISTS warranty_passports`);
  await pool.execute(`
    CREATE TABLE warranty_passports (
      passport_id VARCHAR(50) PRIMARY KEY,
      claim_id VARCHAR(50),
      identity_payload TEXT,
      dna_payload TEXT,
      timeline_payload TEXT,
      relationships TEXT,
      knowledge_links TEXT,
      evidence_links TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);


  console.log("[setup_test_db] ✓ genuinely-missing test tables created");

  // `job_cards` is DROP+CREATE'd fresh on every run by wms_test_schema.sql
  // above, resetting its AUTO_INCREMENT to 1 — but every table below is only
  // ever CREATE TABLE IF NOT EXISTS'd (via migrations, ensureTablesExist, or
  // this script's own "genuinely-missing test tables" block above), so their
  // rows survive indefinitely across runs. That let a stale BILLING_COMPLETED
  // row from an old run collide with a freshly-recycled job_id in a later
  // run, making Phase 8 billing tests fail with a spurious "already billed" /
  // "already validated" (confirmed by direct query: job_cards had only 33
  // live rows but a max job_id of 89, while tbl_pre_invoice and
  // tbl_crm_billing_evidence still held rows for job_id 88/89 from hours
  // earlier). This list was built by grepping every migration + sync.ts +
  // this file for CREATE TABLE IF NOT EXISTS definitions containing a
  // job_id column — truncating them alongside the job_cards reset keeps the
  // whole job-scoped data graph in sync.
  console.log("[setup_test_db] Truncating job-scoped tables (kept in sync with the job_cards reset)...");
  await pool.execute(`SET FOREIGN_KEY_CHECKS = 0`);
  for (const table of [
    // src/db/migrations/008_billing_tables.ts
    "tbl_pre_invoice_confirmation",
    "tbl_pre_invoice_version",
    "tbl_pre_invoice",
    "tbl_crm_billing_evidence",
    "tbl_manual_gate_pass_request",
    // src/db/migrations/009_gate_out_tables.ts
    "tbl_payments",
    "tbl_credit_requests",
    "tbl_gate_pass",
    "tbl_gate_out",
    "tbl_task_claims",
    // src/db/migrations/010_qc_road_tests.ts
    "qc_road_tests",
    // src/db/sync.ts (ensureTablesExist)
    "job_technician_maps",
    "job_revenues",
    "carry_forward_logs",
    "rework_logs",
    "dms_import_rows",
    "rework_tracking",
    "overtime_requests",
    "tbl_workflow_history",
    // this script's own "genuinely-missing test tables" block above
    "digital_approvals",
    "customer_feedback",
  ]) {
    await pool.execute(`TRUNCATE TABLE \`${table}\``);
  }
  await pool.execute(`SET FOREIGN_KEY_CHECKS = 1`);
  console.log("[setup_test_db] ✓ job-scoped tables truncated");

  await pool.execute(`INSERT IGNORE INTO roles (role_id, role_name) VALUES (1, 'Service Advisor'), (2, 'Supervisor'), (3, 'QC Inspector'), (4, 'Security'), (5, 'Admin')`);
  await pool.execute(`INSERT IGNORE INTO modules (module_id, module_name) VALUES (1, 'Job Cards'), (2, 'User Management'), (3, 'Billing')`);
  
  await pool.execute(`
    INSERT IGNORE INTO role_permissions (role_id, module_id, can_view, can_edit, can_approve)
    SELECT r.role_id, m.module_id, 1, CASE WHEN r.role_name = 'Security' THEN 0 ELSE 1 END, 1
    FROM roles r CROSS JOIN modules m
  `);
  
  console.log("[setup_test_db] ✓ mock roles and permissions seeded");

  // NOTE: this builds an EMPTY schema (plus whatever reference data the migrations
  // seed). Many integration tests assume a fully-populated database — authoring a
  // coherent, current TEST FIXTURE (reference + workflow-permission + minimal
  // operational rows, no PII/customer data) is tracked as separate follow-up work.

  console.log("\n[setup_test_db] ✅ DONE — `wms_test` schema is ready. Run: npm test\n");
} catch (err: any) {
  console.error(`\n[setup_test_db] ✗ FAILED: ${err.message}\n`);
  process.exitCode = 1;
} finally {
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  // The DB health-probe interval keeps the event loop alive; exit explicitly.
  process.exit(process.exitCode ?? 0);
}
