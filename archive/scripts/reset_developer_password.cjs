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

  const newPassword = "Dev@12345";
  const hash = await bcrypt.hash(newPassword, 10);

  await db.query(
    `UPDATE users
     SET password_hash = ?
     WHERE username = ?`,
    [hash, "sayeed_dp"]
  );

  console.log("Password reset successfully.");
  console.log("Username: sayeed_dp");
  console.log("Password: Dev@12345");

  await db.end();
})();
