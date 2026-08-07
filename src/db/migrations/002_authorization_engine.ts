/**
 * Migration v2: Authorization Engine Schema
 * 
 * Ensures the ASS-2A authorization tables have the correct schema,
 * including the permission columns that were previously applied via
 * ad-hoc ALTER TABLE statements.
 */

import type { Migration } from "../migrate.ts";

const migration: Migration = {
  version: 2,
  name: "authorization_engine_schema",
  
  up: async (db) => {
    console.log("[Migration v2] Applying authorization engine schema...");
    
    // Ensure role_permissions has all required columns
    // Using ADD COLUMN IF NOT EXISTS pattern (try/catch for MySQL < 8.0.16 compat)
    const permissionColumns = [
      "role_name", "module_name",
      "can_view", "can_create", "can_edit", "can_delete",
      "can_approve", "can_reject", "can_print", "can_export",
      "can_import", "can_assign", "can_close", "can_reopen",
      "can_admin", "can_configure"
    ];
    
    for (const col of permissionColumns) {
      try {
        const colType = (col === "role_name" || col === "module_name") ? "VARCHAR(255) DEFAULT NULL" : "TINYINT(1) DEFAULT 0";
        await db.execute(`ALTER TABLE \`role_permissions\` ADD COLUMN \`${col}\` ${colType}`);
      } catch (e: any) {
        // Column already exists — expected for existing deployments
        if (!e.message.includes("Duplicate column name")) {
          throw e; // Re-throw unexpected errors
        }
      }
    }
    
    // Ensure user_overrides table exists
    await db.execute(`CREATE TABLE IF NOT EXISTS \`user_overrides\` (
      \`override_id\` INT NOT NULL AUTO_INCREMENT,
      \`user_id\` INT NOT NULL,
      \`module_id\` INT NOT NULL,
      \`permission_type\` VARCHAR(50) NOT NULL,
      \`is_allowed\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`override_id\`),
      UNIQUE KEY \`uk_user_module_perm\` (\`user_id\`, \`module_id\`, \`permission_type\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);
    
    // Ensure user_delegations table exists
    await db.execute(`CREATE TABLE IF NOT EXISTS \`user_delegations\` (
      \`delegation_id\` INT NOT NULL AUTO_INCREMENT,
      \`delegator_id\` INT NOT NULL,
      \`delegatee_id\` INT NOT NULL,
      \`module_id\` INT NOT NULL,
      \`effective_from\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`effective_until\` TIMESTAMP NULL DEFAULT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`delegation_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);
    
    // Ensure authorization_audit_log table exists
    await db.execute(`CREATE TABLE IF NOT EXISTS \`authorization_audit_log\` (
      \`audit_id\` INT NOT NULL AUTO_INCREMENT,
      \`user_id\` INT NOT NULL,
      \`action\` VARCHAR(100) NOT NULL,
      \`resource\` VARCHAR(255) NOT NULL,
      \`decision\` VARCHAR(20) NOT NULL,
      \`reason\` TEXT DEFAULT NULL,
      \`ip_address\` VARCHAR(45) DEFAULT NULL,
      \`timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`audit_id\`),
      KEY \`idx_audit_user\` (\`user_id\`),
      KEY \`idx_audit_timestamp\` (\`timestamp\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);
    
    // Seed default roles if they do not exist
    try {
      const defaultRoles = [
        { id: 1, name: "admin", level: "full" },
        { id: 2, name: "service_manager", level: "full" },
        { id: 3, name: "supervisor", level: "limited" },
        { id: 4, name: "reception", level: "read" },
        { id: 5, name: "service_advisor", level: "limited" },
        { id: 6, name: "developer", level: "full" },
        { id: 7, name: "gate_personnel", level: "limited" },
        { id: 8, name: "technician", level: "limited" },
        { id: 9, name: "accounts", level: "read" }
      ];
      for (const r of defaultRoles) {
        await db.execute(
          "INSERT INTO `roles` (`role_id`, `role_name`, `permission_level`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `permission_level`=VALUES(`permission_level`)",
          [r.id, r.name, r.level]
        );
      }
    } catch (err) {
      console.error("[Migration v2] Failed to seed roles:", err);
    }
    
    console.log("[Migration v2] ✓ Authorization engine schema applied");
  }
};

export default migration;
