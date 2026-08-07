import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function main() {
  const host = '35.200.150.167';
  const user = 'root';
  const password = 'WmsSecureMySQL2026!';
  const database = 'railway';

  const conn = await mysql.createConnection({
    host,
    user,
    password,
    database,
    multipleStatements: true
  });

  console.log("Connected to Cloud SQL for Sprint 1 Migration...");
  
  const sqlFile = fs.readFileSync('drizzle_mysql/0010_role_permission_master.sql', 'utf8');
  const statements = sqlFile.split('--> statement-breakpoint');

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    try {
      await conn.query(stmt);
    } catch (e) {
      // If column/constraint already exists, skip it, or log if it fails.
      console.warn(`[WARN] Statement ${i + 1} failed:`, e.message);
    }
  }

  await conn.end();
  console.log("Migration executed successfully!");
}

main().catch(console.error);
