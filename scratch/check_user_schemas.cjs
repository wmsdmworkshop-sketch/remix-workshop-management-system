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
      console.log("--- COLUMNS OF user_access_master ---");
      const [cols1] = await connection.query("SHOW COLUMNS FROM user_access_master");
      console.log(cols1.map(c => `${c.Field} (${c.Type})`));

      console.log("--- COLUMNS OF users ---");
      const [cols2] = await connection.query("SHOW COLUMNS FROM users");
      console.log(cols2.map(c => `${c.Field} (${c.Type})`));
  } catch (e) {
      console.error(e);
  } finally {
      await connection.end();
  }
}
run();
