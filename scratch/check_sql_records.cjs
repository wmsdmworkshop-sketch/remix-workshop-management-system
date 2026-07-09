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
    console.log('=== Database Query Test ===\n');

    // Query 5 vehicles with real registrations
    const [vehicles] = await conn.query(
        "SELECT vm.chassis_no, vm.registration_no, vm.owner_account_name, " +
        "(SELECT COUNT(*) FROM service_history sh WHERE sh.chassis_no = vm.chassis_no) as sh_cnt, " +
        "(SELECT COUNT(*) FROM invoices inv WHERE inv.chassis_no = vm.chassis_no) as inv_cnt " +
        "FROM vehicle_master vm " +
        "WHERE vm.registration_no IS NOT NULL " +
        "  AND (SELECT COUNT(*) FROM service_history sh WHERE sh.chassis_no = vm.chassis_no) > 0 " +
        "LIMIT 5"
    );
    console.log('Sample vehicles with registration and history:');
    vehicles.forEach(v => console.log(`  Reg: ${v.registration_no}, Chassis: ${v.chassis_no}, Name: ${v.owner_account_name}, Services: ${v.sh_cnt}, Invoices: ${v.inv_cnt}`));

    await conn.end();
}

run().catch(console.error);
