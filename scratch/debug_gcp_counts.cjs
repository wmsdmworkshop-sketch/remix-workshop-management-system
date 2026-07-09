const mysql = require('mysql2/promise');

const gcpDbConfig = {
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'WmsSecureMySQL2026!',
    database: 'railway',
};

async function run() {
    const conn = await mysql.createConnection(gcpDbConfig);
    console.log('=== GCP Counts Check ===\n');

    for (const tbl of ['vehicle_master', 'service_history', 'invoices']) {
        const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) as cnt FROM ${tbl}`);
        console.log(`Table ${tbl}: ${cnt} rows`);
    }

    const [sampleVM] = await conn.query('SELECT * FROM vehicle_master LIMIT 3');
    console.log('\nsampleVM:', sampleVM);

    await conn.end();
}

run().catch(console.error);
