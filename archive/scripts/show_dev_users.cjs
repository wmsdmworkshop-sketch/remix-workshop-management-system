require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  const [cols] = await db.query("SHOW COLUMNS FROM users");
  console.log("\n=== USERS TABLE COLUMNS ===");
  console.table(cols);

  const [rows] = await db.query("SELECT * FROM users WHERE role='developer'");
  console.log("\n=== DEVELOPER USERS ===");
  console.table(rows);

  await db.end();
})();
