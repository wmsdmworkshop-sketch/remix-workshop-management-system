const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const connection = await mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
  });

  try {
    console.log('--- RECREATING EMPLOYEE_MASTER FOR COMPATIBILITY ---');
    
    // 1. Recreate table structure
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`employee_master\` (
        \`employee_id\` INT UNSIGNED NOT NULL,
        \`full_name\` VARCHAR(100) NOT NULL,
        \`employee_code\` VARCHAR(20) DEFAULT NULL,
        \`role\` VARCHAR(100) DEFAULT NULL,
        \`employee_grade\` VARCHAR(50) DEFAULT NULL,
        \`basic_salary\` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
        \`mobile\` VARCHAR(15) DEFAULT NULL,
        \`email\` VARCHAR(100) DEFAULT NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT '1',
        \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`employee_id\`),
        UNIQUE KEY \`employee_code\` (\`employee_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // 2. Restore data from backup json
    const backupData = JSON.parse(fs.readFileSync('employee_master_backup.json', 'utf8'));
    console.log(`Restoring ${backupData.length} records into employee_master...`);
    
    for (const row of backupData) {
      await connection.query(
        `INSERT IGNORE INTO employee_master (employee_id, full_name, employee_code, role, employee_grade, basic_salary, mobile, email, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.employee_id, row.full_name, row.employee_code, row.role, row.employee_grade, row.basic_salary, row.mobile, row.email, row.is_active, row.created_at, row.updated_at]
      );
    }
    console.log('Restore finished successfully.');
    
  } catch (e) {
    console.error('Recreation failed:', e);
  } finally {
    await connection.end();
  }
}

run();
