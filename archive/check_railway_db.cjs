const mysql = require('mysql2/promise');

async function run() {
  const host = "thomas.proxy.rlwy.net";
  const port = 50733;
  const user = "root";
  const password = "mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri";
  const database = "railway";

  try {
      const connection = await mysql.createConnection({
        host, port, user, password, database
      });
      console.log("SUCCESSFULLY connected to Railway database!");
      
      const [shRows] = await connection.query("SELECT COUNT(*) as count FROM service_history");
      console.log("Service history count:", shRows);

      const [invRows] = await connection.query("SELECT COUNT(*) as count FROM invoices");
      console.log("Invoices count:", invRows);

      await connection.end();
  } catch (e) {
      console.error("Failed to connect to Railway DB:", e.message);
  }
}
run();
