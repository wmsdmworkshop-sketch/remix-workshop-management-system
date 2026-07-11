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
    console.log('--- SHOW PROCESSLIST ---');
    const [processes] = await connection.query("SHOW PROCESSLIST");
    console.log(processes);
  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
