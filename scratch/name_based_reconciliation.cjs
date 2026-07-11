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
    console.log('--- RE-SYNCING EMAIL & SALARY BY NAME MATCH ---');
    const [employeeMaster] = await connection.query("SELECT * FROM employee_master");
    
    for (const em of employeeMaster) {
      // Find matching employee by case-insensitive name match
      const [empMatch] = await connection.query(
        "SELECT employee_id, full_name FROM employees WHERE UPPER(TRIM(full_name)) = UPPER(TRIM(?))",
        [em.full_name]
      );
      if (empMatch.length > 0) {
        const empId = empMatch[0].employee_id;
        console.log(`Matched '${em.full_name}' (Master ID: ${em.employee_id}) -> 'employees' ID: ${empId}`);
        await connection.query(
          "UPDATE employees SET email = ?, basic_salary = ? WHERE employee_id = ?",
          [em.email, em.basic_salary, empId]
        );
      } else {
        console.log(`❌ No match found in 'employees' for master employee '${em.full_name}'`);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
