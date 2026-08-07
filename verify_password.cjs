require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  const [rows] = await db.query(
    "SELECT username, password_hash FROM users WHERE username='sayeed_dp'"
  );

  const ok = await bcrypt.compare("Dev@12345", rows[0].password_hash);

  console.log("Username:", rows[0].username);
  console.log("Password matches:", ok);

  await db.end();
})();
