const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
  });

  try {
    console.log('--- DROPING FOREIGN KEY references ---');
    
    // List of tables and constraint keys referencing employee_master
    const drops = [
      { table: 'alert_log', key: 'alert_log_ibfk_3' },
      { table: 'bay_queue', key: 'bay_queue_ibfk_3' },
      { table: 'carry_forward_log', key: 'carry_forward_log_ibfk_2' },
      { table: 'carry_forward_log', key: 'carry_forward_log_ibfk_3' },
      { table: 'dms_import_batch', key: 'dms_import_batch_ibfk_1' },
      { table: 'job_card_technician', key: 'job_card_technician_ibfk_2' },
      { table: 'revenue_split_log', key: 'revenue_split_log_ibfk_1' }
    ];

    for (const d of drops) {
      try {
        console.log(`Dropping FK ${d.key} on table ${d.table}...`);
        await connection.query(`ALTER TABLE \`${d.table}\` DROP FOREIGN KEY \`${d.key}\``);
      } catch (err) {
        console.log(`Failed or skipped ${d.key} on ${d.table}:`, err.message);
      }
    }

    console.log('Re-attempting to drop parent table employee_master...');
    await connection.query("DROP TABLE IF EXISTS employee_master");
    console.log('Success! employee_master table dropped.');

  } catch (e) {
    console.error('Final drop execution failed:', e);
  } finally {
    await connection.end();
  }
}

run();
