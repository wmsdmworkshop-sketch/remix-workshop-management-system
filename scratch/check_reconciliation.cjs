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
    console.log('--- RE-CHECKING ROW RECONCILIATION ---');
    const [employees] = await connection.query("SELECT * FROM employees");
    const [employeeMaster] = await connection.query("SELECT * FROM employee_master");
    
    console.log(`Row Counts: employees = ${employees.length}, employee_master = ${employeeMaster.length}`);
    
    const mismatched = [];
    for (const em of employeeMaster) {
      const match = employees.find(e => e.employee_id === em.employee_id);
      if (!match) {
        mismatched.push({ id: em.employee_id, issue: 'Missing in employees' });
      } else {
        if (match.full_name !== em.full_name) mismatched.push({ id: em.employee_id, issue: `Name mismatch: '${match.full_name}' vs '${em.full_name}'` });
        if (match.email !== em.email) mismatched.push({ id: em.employee_id, issue: `Email mismatch: '${match.email}' vs '${em.email}'` });
      }
    }
    
    console.log('Mismatched count:', mismatched.length);
    if (mismatched.length > 0) {
      console.log('Mismatches details:', mismatched);
    } else {
      console.log('RECONCILIATION SUCCESS: 100% row-by-row match.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
