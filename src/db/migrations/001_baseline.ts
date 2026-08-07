/**
 * Migration v1: Baseline Schema Snapshot
 * 
 * This migration captures the EXISTING production schema state.
 * All tables that already exist are created with IF NOT EXISTS,
 * making this migration idempotent against the current production database.
 * 
 * This is the "baseline" — all future schema changes are incremental migrations.
 */

import type { Migration } from "../migrate.ts";

const migration: Migration = {
  version: 1,
  name: "baseline_schema_snapshot",
  
  up: async (db) => {
    // All CREATE TABLE IF NOT EXISTS statements from the existing ensureTablesExist()
    // are consolidated here as the baseline. Since production already has these tables,
    // these are effectively no-ops — but they establish the baseline version.
    
    console.log("[Migration v1] Establishing baseline schema snapshot...");
    
    // Core tables
    await db.execute(`CREATE TABLE IF NOT EXISTS \`employees\` (
      \`employee_id\` INT NOT NULL AUTO_INCREMENT,
      \`full_name\` VARCHAR(255) NOT NULL,
      \`employee_code\` VARCHAR(50) NOT NULL UNIQUE,
      \`role\` VARCHAR(100) NOT NULL,
      \`employee_grade\` VARCHAR(50) NOT NULL DEFAULT 'Junior',
      \`basic_salary\` INT NOT NULL DEFAULT 0,
      \`mobile\` VARCHAR(50) NOT NULL DEFAULT '',
      \`is_active\` TINYINT(1) DEFAULT 1,
      \`created_at\` VARCHAR(100) DEFAULT NULL,
      \`allocated_revenue\` INT DEFAULT 0,
      \`target_revenue\` INT DEFAULT NULL,
      \`paid_pct\` VARCHAR(50) DEFAULT NULL,
      \`tml_claim_pct\` VARCHAR(50) DEFAULT NULL,
      \`certification_level\` VARCHAR(50) DEFAULT NULL,
      \`certification_date\` VARCHAR(100) DEFAULT NULL,
      \`certification_expiry_date\` VARCHAR(100) DEFAULT NULL,
      \`certification_remarks\` TEXT DEFAULT NULL,
      \`email\` VARCHAR(100) DEFAULT NULL,
      \`department\` VARCHAR(100) DEFAULT NULL,
      \`workshop_id\` INT DEFAULT NULL,
      \`shift_id\` INT DEFAULT NULL,
      \`joining_date\` VARCHAR(100) DEFAULT NULL,
      \`profile_photo_url\` TEXT DEFAULT NULL,
      \`face_embedding_reference\` TEXT DEFAULT NULL,
      PRIMARY KEY (\`employee_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);
    
    await db.execute(`CREATE TABLE IF NOT EXISTS \`bays\` (
      \`bay_id\` INT NOT NULL,
      \`bay_code\` VARCHAR(50) NOT NULL,
      \`bay_name\` VARCHAR(100) NOT NULL,
      \`bay_type\` VARCHAR(100) NOT NULL,
      \`status\` VARCHAR(50) NOT NULL DEFAULT 'Idle',
      \`is_active\` TINYINT(1) DEFAULT 1,
      PRIMARY KEY (\`bay_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);
    
    await db.execute(`CREATE TABLE IF NOT EXISTS \`bay_master\` (
      \`bay_id\` INT NOT NULL,
      \`bay_code\` VARCHAR(50) NOT NULL,
      \`bay_name\` VARCHAR(100) NOT NULL,
      \`bay_type\` VARCHAR(100) NOT NULL,
      \`is_active\` TINYINT(1) DEFAULT 1,
      PRIMARY KEY (\`bay_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);
    
    await db.execute(`CREATE TABLE IF NOT EXISTS \`roles\` (
      \`role_id\` INT NOT NULL AUTO_INCREMENT,
      \`role_name\` VARCHAR(255) NOT NULL UNIQUE,
      \`permission_level\` VARCHAR(50) NOT NULL,
      PRIMARY KEY (\`role_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);
    
    await db.execute(`CREATE TABLE IF NOT EXISTS \`models\` (
      \`model_id\` INT NOT NULL AUTO_INCREMENT,
      \`model_name\` VARCHAR(255) NOT NULL UNIQUE,
      PRIMARY KEY (\`model_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

    console.log("[Migration v1] ✓ Baseline established");
  }
};

export default migration;
