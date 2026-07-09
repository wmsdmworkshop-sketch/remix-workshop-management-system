const mysql = require('mysql2/promise');

const gcpDbConfig = {
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'WmsSecureMySQL2026!',
    database: 'railway'
};

async function run() {
    let conn;
    try {
        conn = await mysql.createConnection(gcpDbConfig);
        const [rows] = await conn.query('SELECT job_card_id, job_card_no, vehicle_reg, customer_name, job_status FROM job_card_master');
        console.log('Rows in job_card_master:');
        rows.forEach(r => {
            console.log(`- ID: ${r.job_card_id} | No: ${r.job_card_no} | VRN: ${r.vehicle_reg} | Customer: ${r.customer_name} | Status: ${r.job_status}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        if (conn) await conn.end();
    }
}

run();
