import { pool } from "../src/db/index";

async function runMigration() {
  console.log("🚀 Executing P1-001 DDL Migration: job_card_complaint_history...");
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS job_card_complaint_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_card_id INT NOT NULL,
        version_number INT NOT NULL,
        complaint_text TEXT NOT NULL,
        edited_by_user_id INT DEFAULT NULL,
        edited_by_name VARCHAR(100) NOT NULL,
        edited_role VARCHAR(50) NOT NULL,
        branch_id INT DEFAULT 1,
        edit_reason TEXT DEFAULT NULL,
        source VARCHAR(50) DEFAULT 'WEB_UI',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_jc_id (job_card_id),
        INDEX idx_jc_ver (job_card_id, version_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Table job_card_complaint_history created successfully on Cloud SQL MySQL!");
  } catch (err: any) {
    console.error("❌ Migration error:", err.message);
    process.exit(1);
  }
  process.exit(0);
}

runMigration();
