const mysql = require('mysql2');
const conn = mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
});

const jcs = [
    ['JC-DevAus-AA1-2627-000791', 3, 'KA33B6994', 'SIDDAPPA GIREPPA', 'FIP', '2026-05-31', 'work-in-progress', 22, 22],
    ['MANUALY JOB CARD 1', 8, 'KA32AA7927', 'SHREE RAM ENTERPRISES', 'GEAR BOX', '2026-06-08', 'work-in-progress', 22, 22],
    ['JC-DevAus-AA1-2627-001157', 9, 'KA32AA4660', 'SHRIDHAR PATIL', 'LOW PICKUP', '2026-06-20', 'work-in-progress', 22, 22],
    ['JC-DevAus-AA1-2627-001153', 4, 'KA32AB4258', 'YOUSHRIF ROADLINES', 'LOW PICKUP', '2026-06-23', 'work-in-progress', 40, 40],
    ['MANUALY JOB CARD 2', 6, 'TS38T1266', '', 'GEAR BOX', '2026-06-24', 'work-in-progress', 29, 29],
    ['MANUALY JOB CARD 3', 8, 'MH12XM3879', 'MANIYAR EARTHMOVERS', 'LOW PICKUP', '2026-06-24', 'work-in-progress', 29, 29],
    ['MANUALY JOB CARD 4', 1, 'KA32AB5087', 'RUDRAGOUDA K TIPPANAGOUDAR', 'LOW PICKUP', '2026-06-24', 'work-in-progress', 40, 40],
    ['JC-DevAus-AA1-2627-001169', 7, 'KA32AB6825', 'SANRA LOGISTICS LIMITED', 'WHEEL ALIGNMENT', '2026-06-24', 'work-in-progress', 22, 22]
];

const sql = 'INSERT INTO job_card_master (job_card_no, bay_id, vehicle_reg, customer_name, service_type, etd, live_status, assigned_to, created_by) VALUES ?';

conn.query(sql, [jcs], (e, r) => {
    if (e) console.log('ERROR:', e.message);
    else console.log('INSERTED:', r.affectedRows, 'job cards! ✅');
    conn.end();
});