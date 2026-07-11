/**
 * CR-001 Step 2: Mark duplicate employees as CANONICAL / LEGACY
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

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);

  console.log('=== STEP 2: CANONICAL EMPLOYEE MAPPING ===');

  // 1. Add record_status column to employees table in MySQL
  try {
    await conn.execute("ALTER TABLE `employees` ADD COLUMN `record_status` VARCHAR(50) DEFAULT 'CANONICAL'");
    console.log('  Added record_status column to MySQL employees table.');
  } catch (err) {
    if (err.errno === 1060) {
      console.log('  record_status column already exists in MySQL.');
    } else {
      console.error('  Error adding record_status column:', err.message);
    }
  }

  // 2. Determine canonical vs legacy IDs
  // Canonical: 12 (Mustafa), 7 (Shashikumar)
  // Legacy: 22 (Mustafa), 29 (Shashikumar)
  const legacyIds = [22, 29];
  const canonicalIds = [12, 7];

  console.log('  Updating MySQL records...');
  // Update all employees to default CANONICAL
  await conn.execute("UPDATE `employees` SET `record_status` = 'CANONICAL'");
  
  // Set legacy status
  for (const id of legacyIds) {
    await conn.execute("UPDATE `employees` SET `record_status` = 'LEGACY' WHERE `employee_id` = ?", [id]);
    console.log(`    Marked employee_id=${id} as LEGACY in MySQL.`);
  }

  // 3. Update workshop_db.json local cache
  if (fs.existsSync('workshop_db.json')) {
    console.log('  Updating workshop_db.json...');
    const dbJson = JSON.parse(fs.readFileSync('workshop_db.json', 'utf8'));
    
    dbJson.employees = dbJson.employees.map(emp => {
      let status = 'CANONICAL';
      if (legacyIds.includes(emp.employee_id)) {
        status = 'LEGACY';
      }
      return {
        ...emp,
        record_status: status
      };
    });

    fs.writeFileSync('workshop_db.json', JSON.stringify(dbJson, null, 2));
    console.log('  Successfully updated workshop_db.json.');
  }

  // 4. Update src/db/schema.ts Drizzle definition
  // Let's check where employees table is defined in schema.ts. We saw lines 101-122
  console.log('  Step 2 database mapping completed.');

  await conn.end();
}

run().catch(console.error);
