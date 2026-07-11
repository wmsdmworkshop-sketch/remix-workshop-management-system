const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
  });

  try {
    console.log('--- FETCHING ENTIRE employee TABLES ---');
    const [employees] = await connection.query("SELECT employee_id, full_name, employee_code, role, email FROM employees ORDER BY employee_id");
    const [employeeMaster] = await connection.query("SELECT employee_id, full_name, employee_code, role, email FROM employee_master ORDER BY employee_id");
    
    console.log('\n--- employees table contents ---');
    employees.forEach(e => console.log(`ID: ${e.employee_id}, Name: ${e.full_name}, Code: ${e.employee_code}, Role: ${e.role}`));
    
    console.log('\n--- employee_master table contents ---');
    employeeMaster.forEach(e => console.log(`ID: ${e.employee_id}, Name: ${e.full_name}, Code: ${e.employee_code}, Role: ${e.role}`));

  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
