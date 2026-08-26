import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

(async () => {
  const p = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: { rejectUnauthorized: false },
  });
  await p.execute("DELETE FROM ocr_evidence WHERE vrn = 'KA32AB9999'");
  console.log("Cleaned up test record");
  await p.end();
})();
