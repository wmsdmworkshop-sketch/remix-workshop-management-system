const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    process.env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
  }
}

async function main() {
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || "railway",
    connectTimeout: 10000
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log("Connected to local/Railway database.");

    const tables = ['vehicle_master', 'service_history', 'invoices'];
    for (const table of tables) {
      try {
        const [rows] = await connection.query(`SELECT COUNT(*) as count FROM \`${table}\``);
        console.log(`${table} count:`, rows[0].count);
      } catch (err) {
        console.log(`Failed to read table ${table}:`, err.message);
      }
    }

    await connection.end();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
