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
    "ALTER TABLE staff_feedback ADD COLUMN ide_agent_prompt TEXT",
    "ALTER TABLE staff_feedback ADD COLUMN in_house_action TEXT"
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
