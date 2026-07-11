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
    console.log('--- RESOLVING UNMATCHED MASTER EMPLOYEES ---');
    const unmatched = [
      { name: 'HANUMATH RAYA', target: 'HANNAMANTHRAYA' },
      { name: 'PRABHULING', target: 'PRABHULING' }, // Check if code can find case/fuzzy match
      { name: 'RAGHUVENDRA KULKARNI', target: 'RAGHAVENDRA KULKARNI' },
      { name: 'SAMEERUDDIN', target: 'SAMEERUDDIN' },
      { name: 'SURESH SHIVAJI NATIKAR', target: 'SURESH SHIVAJI NATIKAR' },
      { name: 'javeed j', target: 'JAVEED PASHA' },
      { name: 'SAYEED', target: 'MUBEEN' } // Let's check who SAYEED is or create if new
    ];

    for (const item of unmatched) {
      const [empMaster] = await connection.query("SELECT * FROM employee_master WHERE full_name = ?", [item.name]);
      if (empMaster.length > 0) {
        const em = empMaster[0];
        const [empMatch] = await connection.query(
          "SELECT employee_id FROM employees WHERE UPPER(TRIM(full_name)) = UPPER(TRIM(?))",
          [item.target]
        );
        if (empMatch.length > 0) {
          const empId = empMatch[0].employee_id;
          console.log(`Resolved '${item.name}' -> employees ID: ${empId} ('${item.target}')`);
          await connection.query(
            "UPDATE employees SET email = ?, basic_salary = ? WHERE employee_id = ?",
            [em.email, em.basic_salary, empId]
          );
        } else {
          // If no target match, insert it into employees to avoid orphan records!
          console.log(`Inserting unmatched master record '${item.name}' into employees table...`);
          await connection.query(
            `INSERT INTO employees (full_name, employee_code, role, employee_grade, basic_salary, mobile, email, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [em.full_name, `EMP${String(Date.now()).slice(-3)}`, em.role || 'Staff', em.employee_grade || 'Junior', em.basic_salary || 0, em.mobile || '', em.email || '']
          );
        }
      }
    }

  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
