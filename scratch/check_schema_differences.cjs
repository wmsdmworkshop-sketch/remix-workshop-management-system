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
    console.log('=== employee_master Sample ===');
    const [em] = await connection.query('SELECT * FROM employee_master LIMIT 2');
    console.log(em);

    console.log('\n=== employees Sample ===');
    const [e] = await connection.query('SELECT * FROM employees LIMIT 2');
    console.log(e);

    console.log('\n=== job_card_master Sample ===');
    const [jcm] = await connection.query('SELECT * FROM job_card_master LIMIT 2');
    console.log(jcm);

    console.log('\n=== users Sample ===');
    const [u] = await connection.query('SELECT * FROM users LIMIT 2');
    console.log(u);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

run();
