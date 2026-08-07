/**
 * Migration v7: Workforce Eligibility Architecture Attributes
 * 
 * Adds canonical boolean eligibility flags to the `employees` table:
 * - is_workshop_employee
 * - is_technician_eligible
 * - is_labour_revenue_eligible
 * - is_bay_assignable
 * - is_breakdown_eligible
 * - is_qc_eligible
 * - is_warranty_eligible
 * 
 * Automatically populates default eligibility values based on initial workforce roles.
 */

import type { Migration } from "../migrate.ts";

const migration: Migration = {
  version: 7,
  name: "workforce_eligibility_attributes",
  
  up: async (db) => {
    console.log("[Migration v7] Adding workforce eligibility columns to employees table...");

    const columns = [
      "ADD COLUMN `is_workshop_employee` TINYINT(1) DEFAULT 1",
      "ADD COLUMN `is_technician_eligible` TINYINT(1) DEFAULT 0",
      "ADD COLUMN `is_labour_revenue_eligible` TINYINT(1) DEFAULT 0",
      "ADD COLUMN `is_bay_assignable` TINYINT(1) DEFAULT 0",
      "ADD COLUMN `is_breakdown_eligible` TINYINT(1) DEFAULT 0",
      "ADD COLUMN `is_qc_eligible` TINYINT(1) DEFAULT 0",
      "ADD COLUMN `is_warranty_eligible` TINYINT(1) DEFAULT 0"
    ];

    for (const colDef of columns) {
      try {
        await db.execute(`ALTER TABLE \`employees\` ${colDef}`);
      } catch (e: any) {
        // Ignore duplicate column errors if already exists
        if (!e.message?.includes("Duplicate column")) {
          console.warn(`[Migration v7] Notice altering table:`, e.message);
        }
      }
    }

    console.log("[Migration v7] Populating initial eligibility attributes for workshop roles...");

    // 1. Mark Technicians / Electricians / Mechanics
    await db.execute(`
      UPDATE \`employees\`
      SET 
        is_workshop_employee = 1,
        is_technician_eligible = 1,
        is_labour_revenue_eligible = 1,
        is_bay_assignable = 1,
        is_breakdown_eligible = 1,
        is_qc_eligible = 0,
        is_warranty_eligible = 0
      WHERE LOWER(role) LIKE '%tech%'
         OR LOWER(role) LIKE '%electrician%'
         OR LOWER(role) LIKE '%mechanic%'
         OR LOWER(role) LIKE '%denter%'
         OR LOWER(role) LIKE '%welder%'
         OR LOWER(role) LIKE '%painter%'
         OR LOWER(role) LIKE '%helper%'
    `);

    // 2. Mark QC Executives
    await db.execute(`
      UPDATE \`employees\`
      SET 
        is_workshop_employee = 1,
        is_technician_eligible = 0,
        is_labour_revenue_eligible = 0,
        is_bay_assignable = 0,
        is_breakdown_eligible = 0,
        is_qc_eligible = 1,
        is_warranty_eligible = 0
      WHERE LOWER(role) LIKE '%qc%'
         OR LOWER(role) LIKE '%quality%'
    `);

    // 3. Mark Warranty / Breakdown Specialists
    await db.execute(`
      UPDATE \`employees\`
      SET 
        is_workshop_employee = 1,
        is_warranty_eligible = 1
      WHERE LOWER(role) LIKE '%warranty%'
    `);

    // 4. Revoke all technical eligibility for Driver / BD Assistant / Accounts / HR / Security
    await db.execute(`
      UPDATE \`employees\`
      SET 
        is_technician_eligible = 0,
        is_labour_revenue_eligible = 0,
        is_bay_assignable = 0,
        is_breakdown_eligible = 0,
        is_qc_eligible = 0,
        is_warranty_eligible = 0
      WHERE LOWER(role) LIKE '%driver%'
         OR LOWER(role) LIKE '%bd assistant%'
         OR LOWER(role) LIKE '%accounts%'
         OR LOWER(role) LIKE '%hr%'
         OR LOWER(role) LIKE '%security%'
         OR LOWER(role) LIKE '%reception%'
         OR LOWER(role) LIKE '%housekeeping%'
    `);
  }
};

export default migration;
