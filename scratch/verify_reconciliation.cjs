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
    
    let matchedCount = 0;
    let missingCount = 0;
    
    for (const em of employeeMaster) {
      // Find matching employee by name (case-insensitive) or ID
      const match = employees.find(e => 
        e.employee_id === em.employee_id || 
        e.full_name.toLowerCase().trim() === em.full_name.toLowerCase().trim() ||
        (em.full_name === 'HANUMATH RAYA' && e.full_name === 'HANNAMANTHRAYA') ||
        (em.full_name === 'RAGHUVENDRA KULKARNI' && e.full_name === 'RAGHAVENDRA KULKARNI') ||
        (em.full_name === 'javeed j' && e.full_name === 'JAVEED PASHA') ||
        (em.full_name === 'SAYEED' && e.full_name === 'MUBEEN')
      );
      
      if (match) {
        matchedCount++;
      } else {
        missingCount++;
        console.log(`Unmatched Master Employee: ID = ${em.employee_id}, Name = ${em.full_name}`);
      }
    }
    
    console.log(`Reconciliation status: Matched = ${matchedCount}, Missing = ${missingCount}`);
  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
