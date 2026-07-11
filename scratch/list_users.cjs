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
    console.log('--- USERS IN DATABASE ---');
    const [users] = await connection.query("SELECT user_id, username, role, employee_id FROM users");
    console.log('users:', users);

    console.log('--- USER ACCESS MASTER IN DATABASE ---');
    const [userAccess] = await connection.query("SELECT user_id, username, user_role, employee_id FROM user_access_master");
    console.log('user_access_master:', userAccess);

  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
