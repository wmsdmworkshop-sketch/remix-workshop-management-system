const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: '35.200.150.167',
      port: 3306,
      user: 'root',
      password: 'WmsSecureMySQL2026!',
      database: 'railway'
    });
    console.log("Connected successfully to GCP Cloud SQL!");
    const [tables] = await conn.query("SHOW TABLES");
    console.log("Tables:", tables.map(t => Object.values(t)[0]));
    await conn.end();
  } catch (e) {
    console.error("GCP Cloud SQL connection failed:", e.message);
  }
}
run();
