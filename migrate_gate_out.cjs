const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

const DATA_FILE = path.join(__dirname, 'workshop_db.json');

// Connect to Railway MySQL database
const conn = mysql.createConnection({
  host: 'thomas.proxy.rlwy.net',
  port: 50733,
  user: 'root',
  password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
  database: 'railway'
});

(async () => {
  console.log("Starting database backfill for gate_out_time on job_card_master...");

  // 1. Update Railway MySQL Database
  await new Promise((resolve) => {
    // Set gate_out_time to actual_delivery (or created_at fallback) for Ready / Delivered job cards
    const query = `
      UPDATE job_card_master 
      SET gate_out_time = COALESCE(actual_delivery, created_at, NOW()) 
      WHERE (job_status = 'Ready' OR job_status = 'Delivered') 
        AND (gate_out_time IS NULL);
    `;
    conn.query(query, (err, results) => {
      if (err) {
        console.error("Error updating Railway MySQL database:", err.message);
      } else {
        console.log(`Successfully updated ${results.affectedRows} rows in Railway MySQL database.`);
      }
      resolve();
    });
  });
  conn.end();

  // 2. Update Local workshop_db.json
  if (fs.existsSync(DATA_FILE)) {
    try {
      const dbContent = fs.readFileSync(DATA_FILE, 'utf-8');
      const db = JSON.parse(dbContent);
      let localUpdatedCount = 0;

      if (db.jobCards && Array.isArray(db.jobCards)) {
        db.jobCards.forEach(job => {
          if ((job.status === 'Completed' || job.status === 'Invoiced') && (!job.gate_out_time || job.gate_out_time === 'null')) {
            job.gate_out_time = job.completed_at || job.invoiced_at || job.created_at || new Date().toISOString();
            localUpdatedCount++;
          }
        });

        if (localUpdatedCount > 0) {
          fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
          console.log(`Successfully updated ${localUpdatedCount} job cards in local workshop_db.json.`);
        } else {
          console.log("No local job cards needed updating.");
        }
      }
    } catch (e) {
      console.error("Error updating local workshop_db.json:", e.message);
    }
  } else {
    console.log("Local database file workshop_db.json not found.");
  }

  console.log("Database backfill migration complete!");
})();
