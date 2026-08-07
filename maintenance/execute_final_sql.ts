import { pool as db } from "../src/db/index.ts";

async function main() {
  try {
    const [rows] = await db.query(`
      SELECT customer_passport_id,
             contact_phone,
             customer_name
      FROM customer_passports
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    console.log("=== SQL RESULTS ===");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
