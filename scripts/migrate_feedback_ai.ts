import mysql from 'mysql2/promise';
import 'dotenv/config';

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  const alterStatements = [
    "ALTER TABLE staff_feedback ADD COLUMN ai_analysis TEXT",
    "ALTER TABLE staff_feedback ADD COLUMN ai_severity VARCHAR(30) DEFAULT 'MEDIUM'",
    "ALTER TABLE staff_feedback ADD COLUMN ai_suggested_fix TEXT",
    "ALTER TABLE staff_feedback ADD COLUMN ai_status VARCHAR(30) DEFAULT 'TRIAGED'",
    "ALTER TABLE staff_feedback ADD COLUMN device_info TEXT"
  ];

  for (const sql of alterStatements) {
    try {
      await conn.query(sql);
      console.log('Executed:', sql);
    } catch (e: any) {
      console.log('Ignored/Already exists:', e.message);
    }
  }

  await conn.end();
}

migrate();
