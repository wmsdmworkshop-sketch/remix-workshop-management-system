const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
  });

  try {
    console.log('--- CLEANING CONSTRAINTS & DEPLOYING FINAL DROP ---');

    // 1. Drop foreign key constraints referencing employee_master to avoid constraint violation errors
    console.log('Dropping foreign key references to employee_master...');
    try {
      await connection.query("ALTER TABLE alert_logs DROP FOREIGN KEY alert_log_ibfk_3");
    } catch(e) { console.log('alert_log_ibfk_3 drop skipped or not present.'); }
    
    try {
      await connection.query("ALTER TABLE carry_forward_logs DROP FOREIGN KEY carry_forward_log_ibfk_2");
    } catch(e) { console.log('carry_forward_log_ibfk_2 drop skipped or not present.'); }
    
    try {
      await connection.query("ALTER TABLE carry_forward_logs DROP FOREIGN KEY carry_forward_log_ibfk_3");
    } catch(e) { console.log('carry_forward_log_ibfk_3 drop skipped or not present.'); }
    
    try {
      await connection.query("ALTER TABLE dms_import_batches DROP FOREIGN KEY dms_import_batch_ibfk_1");
    } catch(e) { console.log('dms_import_batch_ibfk_1 drop skipped or not present.'); }

    try {
      await connection.query("ALTER TABLE job_card_master DROP FOREIGN KEY job_card_master_ibfk_2");
    } catch(e) { console.log('job_card_master_ibfk_2 drop skipped or not present.'); }

    try {
      await connection.query("ALTER TABLE job_card_master DROP FOREIGN KEY job_card_master_ibfk_3");
    } catch(e) { console.log('job_card_master_ibfk_3 drop skipped or not present.'); }

    try {
      await connection.query("ALTER TABLE revenue_split_log DROP FOREIGN KEY revenue_split_log_ibfk_1");
    } catch(e) { console.log('revenue_split_log_ibfk_1 drop skipped or not present.'); }

    // 2. Drop employee_master
    console.log('Dropping table employee_master...');
    await connection.query("DROP TABLE IF EXISTS employee_master");
    console.log('employee_master dropped successfully.');

  } catch (e) {
    console.error('Final drop execution failed:', e);
  } finally {
    await connection.end();
  }
}

run();
