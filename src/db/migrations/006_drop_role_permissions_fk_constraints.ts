/**
 * Migration v6: Remove Foreign Key Constraints on role_permissions
 * 
 * Drops foreign key constraints on role_permissions (role_id, module_id)
 * so UAT endpoints and dynamic role resolution can insert/update records
 * without strict FK blocking in varying environments.
 */

import type { Migration } from "../migrate.ts";

const migration: Migration = {
  version: 6,
  name: "drop_role_permissions_fk_constraints",
  
  up: async (db) => {
    console.log("[Migration v6] Removing blocking FK constraints on role_permissions...");
    
    // Query information_schema for foreign key constraint names on role_permissions
    try {
      const [rows] = await db.execute(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'role_permissions' 
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `) as any[];
      
      if (rows && Array.isArray(rows)) {
        for (const r of rows) {
          const constraintName = r.CONSTRAINT_NAME;
          try {
            await db.execute(`ALTER TABLE \`role_permissions\` DROP FOREIGN KEY \`${constraintName}\``);
            console.log(`[Migration v6] Dropped FK constraint: ${constraintName}`);
          } catch (e: any) {
            console.warn(`[Migration v6] Notice dropping FK ${constraintName}:`, e.message);
          }
        }
      }
    } catch (err: any) {
      console.warn("[Migration v6] Error inspecting FK constraints:", err.message);
    }
  }
};

export default migration;
