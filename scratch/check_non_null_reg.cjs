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
    
    // Find rows with non-null registration_no
    const [nonNullReg] = await conn.query(
        "SELECT chassis_no, registration_no, owner_account_name FROM vehicle_master WHERE registration_no IS NOT NULL LIMIT 5"
    );
    console.log('Sample vehicles with registration_no:', nonNullReg);

    // Let's count how many have non-null registration_no
    const [[{ cnt }]] = await conn.query(
        "SELECT COUNT(*) as cnt FROM vehicle_master WHERE registration_no IS NOT NULL"
    );
    console.log('Total vehicles with registration_no:', cnt);

    await conn.end();
}

run().catch(console.error);
