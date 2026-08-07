/**
 * Migration v3: Role Permissions Column Alignment
 * 
 * Explicitly adds role_name and module_name to role_permissions table
 * if missing in live database environments.
 */

import type { Migration } from "../migrate.ts";

const migration: Migration = {
  version: 3,
  name: "role_permissions_column_alignment",
  
  up: async (db) => {
    console.log("[Migration v3] Ensuring role_name and module_name exist in role_permissions...");
    
    const requiredCols = [
      { name: "role_name", type: "VARCHAR(255) DEFAULT NULL" },
      { name: "module_name", type: "VARCHAR(255) DEFAULT NULL" }
    ];
    
    for (const col of requiredCols) {
      try {
        await db.execute(`ALTER TABLE \`role_permissions\` ADD COLUMN \`${col.name}\` ${col.type}`);
        console.log(`[Migration v3] Added column ${col.name} to role_permissions`);
      } catch (e: any) {
        if (!e.message.includes("Duplicate column name")) {
          console.warn(`[Migration v3] Column ${col.name} alter notice:`, e.message);
        }
      }
    }
  }
};

export default migration;
