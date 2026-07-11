const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run() {
  const connection = await mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
  });

  try {
    const [rows] = await connection.query("SELECT password_hash FROM user_access_master WHERE username = 'mustafa'");
    if (rows.length === 0) {
      console.log('Mustafa not found in user_access_master.');
      return;
    }
    const hash = rows[0].password_hash;
    const candidates = [
      'Advsr@DWIP2026', 'mustafa', 'mustafa123', 'mustafa@123', 'password', 'password123', 'admin',
      'Advisor@DWIP2026', 'ServiceAdvisor@DWIP2026', 'Advsr@123', 'Advisor@123'
    ];
    for (const c of candidates) {
      const match = await bcrypt.compare(c, hash);
      if (match) {
        console.log(`FOUND MUSTAFA PASSWORD: '${c}'`);
        return;
      }
    }
    console.log('No common password matched.');
  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
