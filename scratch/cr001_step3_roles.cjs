/**
 * CR-001 Step 3: Role Normalization
 */

const mysql = require('mysql2/promise');
const fs = require('fs');

const DB_CONFIG = {
  host: 'thomas.proxy.rlwy.net',
  port: 50733,
  user: 'root',
  password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
  database: 'railway'
};

// Approved Production Taxonomy
const APPROVED_TAXONOMY = new Set([
  'developer', 'admin', 'dealer_principal', 'gm_service', 'workshop_manager',
  'floor_supervisor', 'service_advisor', 'breakdown_assistant', 'technician',
  'senior_technician', 'electrician', 'denter', 'painter', 'qc_inspector',
  'parts_manager', 'parts_executive', 'store_keeper', 'billing_executive',
  'cashier', 'delivery_coordinator', 'customer_relation_executive', 'security',
  'driver', 'helper', 'washing', 'housekeeping'
]);

// Mapping of obvious aliases
const ALIAS_MAP = {
  'SA': 'service_advisor',
  'SA ': 'service_advisor',
  'SUPERVISOR': 'floor_supervisor',
  'Jr. technician': 'technician',
  'Sr. Technician': 'senior_technician',
  'Jr. elecrician': 'electrician',
  'MECHANICAL HELPER': 'helper',
  'Helper': 'helper',
  'DRIVER': 'driver',
  'electrician': 'electrician',
  'service_advisor': 'service_advisor'
};

// Compound roles (do NOT modify, mark for multi-role review)
const COMPOUND_ROLES = [
  'BD ASSISTANT/ DRIVER',
  'Parts Helper'
];

// Other roles (unmappable, require manual review)
const MANUAL_REVIEW_ROLES = [
  'Sr. Electrician', // Could be electrician or senior_technician, requires review
  'BILLER', // Could be billing_executive or cashier
  'WARRANTY ASSISTANT',
  'FLOOR INCHARGE',
  'OIL INCHARGE',
  'TOOLS INCHARGE',
  'technician trainee',
  'Electrician trainee',
  'Electrician Trainee',
  'BAY REPORTER',
  'Parts'
];

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('=== STEP 3: ROLE NORMALIZATION ===');

  // Let's first add a legacy_role column to employees to preserve original values for safety
  try {
    await conn.execute("ALTER TABLE `employees` ADD COLUMN `legacy_role` VARCHAR(100) DEFAULT NULL");
    console.log('  Added legacy_role column to employees table in MySQL.');
  } catch (err) {
    if (err.errno === 1060) {
      console.log('  legacy_role column already exists.');
    } else {
      console.warn('  Error adding legacy_role column:', err.message);
    }
  }

  // Backup current roles into legacy_role if legacy_role is null
  await conn.execute("UPDATE `employees` SET `legacy_role` = `role` WHERE `legacy_role` IS NULL");
  console.log('  Preserved current roles in legacy_role column.');

  // Fetch all employees to update both MySQL and workshop_db.json
  const [employees] = await conn.query("SELECT * FROM employees");

  const normalizations = [];
  const compounds = [];
  const manuals = [];

  const dbJson = fs.existsSync('workshop_db.json') ? JSON.parse(fs.readFileSync('workshop_db.json', 'utf8')) : null;

  for (const emp of employees) {
    const rawRole = emp.role;
    let action = 'NO_CHANGE';
    let newRole = rawRole;

    if (ALIAS_MAP[rawRole]) {
      newRole = ALIAS_MAP[rawRole];
      action = 'NORMALIZE';
      normalizations.push({
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        original: rawRole,
        normalized: newRole
      });

      // Update in MySQL
      await conn.execute("UPDATE `employees` SET `role` = ? WHERE `employee_id` = ?", [newRole, emp.employee_id]);
      
      // Update in workshop_db.json
      if (dbJson) {
        const localEmp = dbJson.employees.find(e => e.employee_id === emp.employee_id);
        if (localEmp) {
          localEmp.role = newRole;
          localEmp.legacy_role = rawRole;
        }
      }
    } else if (COMPOUND_ROLES.includes(rawRole)) {
      action = 'COMPOUND_REVIEW';
      compounds.push({
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        role: rawRole
      });
      // Keep legacy role in JSON
      if (dbJson) {
        const localEmp = dbJson.employees.find(e => e.employee_id === emp.employee_id);
        if (localEmp) {
          localEmp.legacy_role = rawRole;
        }
      }
    } else {
      action = 'MANUAL_REVIEW';
      manuals.push({
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        role: rawRole
      });
      // Keep legacy role in JSON
      if (dbJson) {
        const localEmp = dbJson.employees.find(e => e.employee_id === emp.employee_id);
        if (localEmp) {
          localEmp.legacy_role = rawRole;
        }
      }
    }
  }

  if (dbJson) {
    fs.writeFileSync('workshop_db.json', JSON.stringify(dbJson, null, 2));
    console.log('  Updated workshop_db.json with normalized roles and legacy_role backups.');
  }

  // Write reports/results to a JSON for markdown generator
  const resultData = {
    normalizations,
    compounds,
    manuals
  };
  fs.writeFileSync('scratch/cr001_role_results.json', JSON.stringify(resultData, null, 2));
  console.log('  Saved role normalization results to scratch/cr001_role_results.json.');

  await conn.end();
  console.log('=== ROLE NORMALIZATION COMPLETE ===');
}

run().catch(console.error);
