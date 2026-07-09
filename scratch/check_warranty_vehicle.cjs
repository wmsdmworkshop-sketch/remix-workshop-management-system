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
    console.log('=== Checking KA32AA5833 ===\n');

    // 1. Check vehicle_master
    const [vehicles] = await conn.query(
        "SELECT * FROM vehicle_master WHERE registration_no = 'KA32AA5833'"
    );
    console.log('Vehicle Master matching KA32AA5833:', vehicles);

    if (vehicles.length > 0) {
        const chassis = vehicles[0].chassis_no;
        // 2. Check service_history
        const [services] = await conn.query(
            "SELECT * FROM service_history WHERE chassis_no = ?",
            [chassis]
        );
        console.log(`\nService History records (${services.length}):`, services);

        // 3. Check invoices
        const [invoices] = await conn.query(
            "SELECT * FROM invoices WHERE chassis_no = ?",
            [chassis]
        );
        console.log(`\nInvoices (${invoices.length}):`, invoices);
    } else {
        // Try searching case insensitively or partially
        const [partialVehicles] = await conn.query(
            "SELECT * FROM vehicle_master WHERE registration_no LIKE '%5833%'"
        );
        console.log('\nPartial matches containing 5833:', partialVehicles);
    }

    await conn.end();
}

run().catch(console.error);
