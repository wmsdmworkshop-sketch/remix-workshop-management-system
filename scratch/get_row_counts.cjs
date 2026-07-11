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
    const tables = ['employees', 'employee_master', 'users', 'user_access_master', 'job_cards', 'job_card_master', 'vehicle_master', 'dim_vehicle_master', 'service_history', 'fact_service_history', 'invoices', 'fact_invoices', 'breakdowns'];
    for (const t of tables) {
      const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${t}\``);
      console.log(`Table: ${t} -> Row count: ${countResult[0].count}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
