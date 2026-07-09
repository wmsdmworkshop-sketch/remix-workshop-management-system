const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '35.200.150.167',
    user: 'root',
    password: 'WmsSecureMySQL2026!',
    database: 'railway',
    port: 3306
  });

  try {
    const [rows] = await connection.execute('SELECT user_id, username, full_name, user_role, mobile_no, email, employee_id FROM user_access_master LIMIT 20');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
run();
