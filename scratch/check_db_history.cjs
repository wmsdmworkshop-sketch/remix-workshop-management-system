const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const host = process.env.DB_HOST || "thomas.proxy.rlwy.net";
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 50733;
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri";
  const database = process.env.DB_DATABASE || "railway";

  const connection = await mysql.createConnection({
    host, port, user, password, database
  });

  try {
      console.log("--- SERVICE HISTORY ROWS ---");
      const [shRows] = await connection.query("SELECT sh_no, chassis_no, registration_no, sr_no, odometer_reading, contact_full_name FROM service_history LIMIT 10");
      console.log(shRows);

      console.log("--- INVOICES ROWS ---");
      const [invRows] = await connection.query("SELECT invoice_no, chassis_no, registration_no, sr_no, order_no, final_consolidated_amt, final_labour_amount, final_spares_amount FROM invoices LIMIT 10");
      console.log(invRows);
  } catch (e) {
      console.error(e);
  } finally {
      await connection.end();
  }
}
run();
