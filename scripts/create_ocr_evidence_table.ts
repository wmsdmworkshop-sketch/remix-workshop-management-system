import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: { rejectUnauthorized: false },
  });

  console.log("Creating ocr_evidence table if not exists...");
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS \`ocr_evidence\` (
      \`evidence_id\` VARCHAR(50) NOT NULL,
      \`ocr_type\` ENUM('NUMBERPLATE','INVOICE','MANUAL_JOBCARD','PARTS_PHOTO','FUEL_GAUGE','ODOMETER') NOT NULL,
      \`job_card_no\` VARCHAR(50) DEFAULT NULL,
      \`gate_entry_id\` VARCHAR(100) DEFAULT NULL,
      \`vrn\` VARCHAR(50) DEFAULT NULL,
      \`photo_url\` VARCHAR(1000) DEFAULT NULL,
      \`photo_size_bytes\` INT DEFAULT NULL,
      \`captured_at\` DATETIME NOT NULL,
      \`captured_by\` INT DEFAULT NULL,
      \`ocr_provider\` VARCHAR(50) DEFAULT NULL,
      \`ocr_result_json\` LONGTEXT DEFAULT NULL,
      \`ocr_confidence\` DECIMAL(5,2) DEFAULT NULL,
      \`retention_expiry\` DATE NOT NULL,
      \`is_deleted\` TINYINT(1) DEFAULT 0,
      \`branch_id\` VARCHAR(50) DEFAULT 'BR-SEDAM',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`evidence_id\`),
      INDEX \`idx_ocr_evidence_type\` (\`ocr_type\`),
      INDEX \`idx_ocr_evidence_vrn\` (\`vrn\`),
      INDEX \`idx_ocr_evidence_jc\` (\`job_card_no\`),
      INDEX \`idx_ocr_evidence_retention\` (\`retention_expiry\`, \`is_deleted\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);

  const [cols]: any = await pool.query("DESCRIBE ocr_evidence");
  console.log("✅ ocr_evidence table ready with columns:", cols.map((c: any) => c.Field).join(", "));

  await pool.end();
})();
