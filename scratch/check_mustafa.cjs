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
    console.log('--- MUSTAFA USER & EMPLOYEE DETAILS ---');
    const [emp] = await connection.query("SELECT * FROM employees WHERE employee_id = 22");
    console.log('Employee:', emp);

    const [userAccess] = await connection.query("SELECT * FROM user_access_master WHERE employee_id = 22");
    console.log('User Access Master:', userAccess);

    const [users] = await connection.query("SELECT * FROM users WHERE employee_id = 22");
    console.log('Users Table:', users);

  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
