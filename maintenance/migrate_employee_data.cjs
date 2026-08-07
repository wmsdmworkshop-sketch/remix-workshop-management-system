const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
  });

  try {
    console.log('--- CONSOLIDATING EMPLOYEE SCHEMAS ---');

    // 1. Alter employees table to add email column if it doesn't exist
    const [cols] = await connection.query("SHOW COLUMNS FROM employees");
    const hasEmail = cols.some(col => col.Field === 'email');
    if (!hasEmail) {
      console.log('Adding email column to employees...');
      await connection.query("ALTER TABLE employees ADD COLUMN email VARCHAR(100) DEFAULT NULL");
    }

    // 2. Sync email addresses from employee_master to employees table
    console.log('Syncing roles, grades, and emails from employee_master...');
    const [employeeMasterRows] = await connection.query("SELECT * FROM employee_master");
    for (const em of employeeMasterRows) {
      // Find matching employee by name or code
      const [empMatch] = await connection.query(
        "SELECT employee_id FROM employees WHERE employee_id = ? OR full_name = ? OR employee_code = ?",
        [em.employee_id, em.full_name, em.employee_code]
      );
      if (empMatch.length > 0) {
        const empId = empMatch[0].employee_id;
        await connection.query(
          "UPDATE employees SET email = ?, basic_salary = ? WHERE employee_id = ?",
          [em.email, em.basic_salary, empId]
        );
      }
    }
    console.log('Sync completed.');

  } catch (e) {
    console.error('Consolidation failed:', e);
  } finally {
    await connection.end();
  }
}

run();
