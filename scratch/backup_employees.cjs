const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  const connection = await mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
  });

  try {
    console.log('--- BACKING UP EMPLOYEES & EMPLOYEE_MASTER ---');
    const [employees] = await connection.query("SELECT * FROM employees");
    const [employeeMaster] = await connection.query("SELECT * FROM employee_master");
    
    fs.writeFileSync(path.join(process.cwd(), 'employees_backup.json'), JSON.stringify(employees, null, 2));
    fs.writeFileSync(path.join(process.cwd(), 'employee_master_backup.json'), JSON.stringify(employeeMaster, null, 2));
    
    console.log(`Backup written successfully. Employees: ${employees.length} rows, Employee Master: ${employeeMaster.length} rows.`);
  } catch (e) {
    console.error('Backup failed:', e);
  } finally {
    await connection.end();
  }
}

run();
