/**
 * Migration v4: Create role_permissions table if missing
 * 
 * Ensures role_permissions table is explicitly created with all required
 * columns if it does not exist in the database.
 */

import type { Migration } from "../migrate.ts";

const migration: Migration = {
  version: 4,
  name: "ensure_role_permissions_table",
  
  up: async (db) => {
    console.log("[Migration v4] Ensuring role_permissions table exists with proper schema...");
    
    await db.execute(`CREATE TABLE IF NOT EXISTS \`role_permissions\` (
      \`permission_id\` INT NOT NULL AUTO_INCREMENT,
      \`role_id\` INT NOT NULL DEFAULT 1,
      \`role_name\` VARCHAR(255) DEFAULT NULL,
      \`module_id\` INT NOT NULL DEFAULT 1,
      \`module_name\` VARCHAR(255) DEFAULT NULL,
      \`can_view\` TINYINT(1) DEFAULT 0,
      \`can_create\` TINYINT(1) DEFAULT 0,
      \`can_edit\` TINYINT(1) DEFAULT 0,
      \`can_delete\` TINYINT(1) DEFAULT 0,
      \`can_approve\` TINYINT(1) DEFAULT 0,
      \`can_reject\` TINYINT(1) DEFAULT 0,
      \`can_print\` TINYINT(1) DEFAULT 0,
      \`can_export\` TINYINT(1) DEFAULT 0,
      \`can_import\` TINYINT(1) DEFAULT 0,
      \`can_assign\` TINYINT(1) DEFAULT 0,
      \`can_close\` TINYINT(1) DEFAULT 0,
      \`can_reopen\` TINYINT(1) DEFAULT 0,
      \`can_admin\` TINYINT(1) DEFAULT 0,
      \`can_configure\` TINYINT(1) DEFAULT 0,
      \`updated_by\` INT DEFAULT NULL,
      \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`permission_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);
  }
};

export default migration;
