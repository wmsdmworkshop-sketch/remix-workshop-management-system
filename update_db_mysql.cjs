const mysql = require('mysql2');
const conn = mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
});

const queries = [
    // Create gate_entries table if not exists
    `CREATE TABLE IF NOT EXISTS gate_entries (
      gate_id INT PRIMARY KEY,
      token_number VARCHAR(255) NOT NULL,
      vrn VARCHAR(255) NOT NULL,
      vehicle_model VARCHAR(255) NOT NULL,
      chassis_number VARCHAR(255) NOT NULL,
      km_reading INT NOT NULL,
      driver_name VARCHAR(255) NOT NULL,
      driver_mobile VARCHAR(255) NOT NULL,
      driver_image LONGTEXT NULL,
      waiting_time_mins INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      created_at VARCHAR(255) NOT NULL
    )`,
    // Add columns to job_cards table
    `ALTER TABLE job_cards ADD COLUMN chassis_number TEXT NULL`,
    `ALTER TABLE job_cards ADD COLUMN driver_name TEXT NULL`,
    `ALTER TABLE job_cards ADD COLUMN driver_mobile TEXT NULL`,
    `ALTER TABLE job_cards ADD COLUMN driver_image LONGTEXT NULL`,
    `ALTER TABLE job_cards ADD COLUMN token_number TEXT NULL`,
    `ALTER TABLE job_cards ADD COLUMN waiting_time_mins INT NULL`,
    `ALTER TABLE job_cards ADD COLUMN progress_pct INT DEFAULT 0`,
    `ALTER TABLE job_cards ADD COLUMN parts_price INT DEFAULT 0`,
    `ALTER TABLE job_cards ADD COLUMN labor_price INT DEFAULT 0`,
    `ALTER TABLE job_cards ADD COLUMN parts_status VARCHAR(255) DEFAULT 'None'`,
    `ALTER TABLE job_cards ADD COLUMN parts_list TEXT NULL`,
    `ALTER TABLE job_cards ADD COLUMN parts_images LONGTEXT NULL`,
    `ALTER TABLE job_cards ADD COLUMN warranty_status VARCHAR(255) DEFAULT 'None'`,
    `ALTER TABLE job_cards ADD COLUMN payment_method VARCHAR(255) NULL`,
    `ALTER TABLE job_cards ADD COLUMN payment_reference VARCHAR(255) NULL`,
    `ALTER TABLE job_cards ADD COLUMN gate_pass_issued BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE job_cards ADD COLUMN exited_at TEXT NULL`
];

(async () => {
    console.log("Starting DB migration on Thomas proxy Railway...");
    for (const q of queries) {
        await new Promise((resolve) => {
            conn.query(q, (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_FIELDNAME') {
                        console.log(`Column already exists. Skipping.`);
                    } else {
                        console.warn(`Query failed: ${q.substring(0, 50)}... | Error: ${err.message}`);
                    }
                } else {
                    console.log(`Successfully executed: ${q.substring(0, 50)}...`);
                }
                resolve();
            });
        });
    }
    conn.end();
    console.log("Migration complete!");
})();
