const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'thomas.proxy.rlwy.net',
  port: 50733,
  user: 'root',
  password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
  database: 'railway'
};

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('Querying process list...');
  const [rows] = await conn.query('SHOW PROCESSLIST');
  console.log(rows);
  await conn.end();
}

run().catch(console.error);
