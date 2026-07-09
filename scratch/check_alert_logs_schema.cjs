const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'WmsSecureMySQL2026!',
    database: 'railway'
  });

  try {
      const [columns] = await connection.query("SHOW COLUMNS FROM alert_logs");
      console.log(columns.map(c => c.Field));
  } catch (e) {
      console.error(e);
  } finally {
      await connection.end();
  }
}
run();
