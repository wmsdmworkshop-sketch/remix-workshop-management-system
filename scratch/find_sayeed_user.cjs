const mysql = require("mysql2/promise");

async function main() {
  const config = {
    host: "35.200.150.167",
    port: 3306,
    user: "root",
    password: "WmsSecureMySQL2026!",
    database: "railway",
    connectTimeout: 5000
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log("Connected to Cloud SQL.");

    const [users] = await connection.query("SELECT user_id, full_name, username, role, is_active FROM users WHERE username LIKE '%sayeed%' OR full_name LIKE '%sayeed%'");
    console.log("Matched users:", users);

    await connection.end();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
