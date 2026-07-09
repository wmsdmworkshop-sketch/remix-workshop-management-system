const mysql = require('mysql2/promise');

const gcpDbConfig = {
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'WmsSecureMySQL2026!',
    database: 'railway'
};

async function run() {
    let connGcp;
    try {
        console.log('Connecting to GCP Cloud SQL database...');
        connGcp = await mysql.createConnection(gcpDbConfig);
        console.log('Connected to GCP!');

        console.log('Clearing database tables...');
        const tables = [
            'job_revenue_split_details',
            'job_revenues',
            'job_technician_maps',
            'carry_forward_logs',
            'rework_logs',
            'alert_logs',
            'job_card_master',
            'dms_import_rows',
            'dms_import_batches',
            'user_access_master',
            'users',
            'employees',
            'bays',
            'sold_vehicles',
            'technician_kpi_daily',
            'rework_tracking',
            'role_permissions',
            'roles'
        ];

        for (const table of tables) {
            console.log(`  Clearing table ${table}...`);
            await connGcp.execute(`DELETE FROM \`${table}\``);
        }

        console.log('✅ GCP Cloud SQL Database cleaned successfully!');
    } catch (e) {
        console.error('❌ Clean failed:', e);
    } finally {
        if (connGcp) await connGcp.end();
    }
}

run();
