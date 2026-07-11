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
    console.log('--- RE-CHECKING FOREIGN KEY CONSTRAINTS ON TABLE alert_log ---');
    const [cols] = await connection.query("SHOW CREATE TABLE alert_log");
    console.log(cols[0]['Create Table']);

    const [cols2] = await connection.query("SHOW CREATE TABLE job_card_master");
    console.log(cols2[0]['Create Table']);
  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
