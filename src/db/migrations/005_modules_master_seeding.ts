/**
 * Migration v5: Modules Table & FK Resolution
 * 
 * Creates modules table and seeds default system modules to satisfy
 * foreign key constraints on role_permissions.
 */

import type { Migration } from "../migrate.ts";

const migration: Migration = {
  version: 5,
  name: "modules_master_seeding",
  
  up: async (db) => {
    console.log("[Migration v5] Ensuring modules table and baseline modules exist...");
    
    await db.execute(`CREATE TABLE IF NOT EXISTS \`modules\` (
      \`module_id\` INT NOT NULL AUTO_INCREMENT,
      \`module_name\` VARCHAR(255) NOT NULL UNIQUE,
      PRIMARY KEY (\`module_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);
    
    const defaultModules = [
      { id: 1, name: "Dashboard" },
      { id: 2, name: "Bay Queue" },
      { id: 3, name: "Job Cards" },
      { id: 4, name: "Revenue" },
      { id: 5, name: "Ledger" },
      { id: 6, name: "Warranty" },
      { id: 7, name: "FSB" },
      { id: 8, name: "Query" },
      { id: 9, name: "Billing" },
      { id: 10, name: "DMS Import" },
      { id: 11, name: "User Management" },
      { id: 12, name: "Breakdowns" }
    ];

    for (const m of defaultModules) {
      try {
        await db.execute(
          "INSERT INTO `modules` (`module_id`, `module_name`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `module_name`=VALUES(`module_name`)",
          [m.id, m.name]
        );
      } catch (err: any) {
        console.warn(`[Migration v5] Module seed warning for ${m.name}:`, err.message);
      }
    }
  }
};

export default migration;
