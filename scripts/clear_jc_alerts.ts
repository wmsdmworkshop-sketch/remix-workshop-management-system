import mysql from 'mysql2/promise';
import fs from 'fs';
import 'dotenv/config';

async function resetData() {
  console.log('=== Clearing Job Cards & Alerts from MySQL ===');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  const jcTables = [
    'job_technician_maps',
    'job_card_parts',
    'job_card_service_item',
    'job_card_technician',
    'job_revenue_split_details',
    'job_revenue_split',
    'job_revenues',
    'carry_forward_log',
    'carry_forward_logs',
    'rework_logs',
    'rework_tracking',
    'gate_entries',
    'jc_update_requests',
    'job_card_complaint_history',
    'job_card_master',
    'job_cards'
  ];

  const alertTables = [
    'alert_log',
    'alert_logs',
    'cctv_alerts',
    'productivity_alerts'
  ];

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of [...jcTables, ...alertTables]) {
    try {
      await conn.query('DELETE FROM ' + table);
      console.log('  ✓ Cleared table: ' + table);
    } catch (err: any) {
      if (err.code !== 'ER_NO_SUCH_TABLE') {
        console.warn('  ! Notice on ' + table + ': ' + err.message);
      }
    }
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();

  console.log('\n=== Clearing Job Cards & Alerts from workshop_db.json ===');
  if (fs.existsSync('workshop_db.json')) {
    const raw = fs.readFileSync('workshop_db.json', 'utf8');
    const db = JSON.parse(raw);
    db.jobCards = [];
    db.alertLogs = [];
    db.jobTechnicianMaps = [];
    db.jobRevenues = [];
    db.revenueSplits = [];
    db.carryForwardLogs = [];
    db.reworkLogs = [];
    fs.writeFileSync('workshop_db.json', JSON.stringify(db, null, 2));
    console.log('  ✓ Cleared in-memory cache lists in workshop_db.json');
  }

  console.log('\n✅ All Job Cards and Alerts successfully cleared!');
}

resetData().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
