const mysql = require('mysql2/promise');

const gcpDbConfig = {
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'WmsSecureMySQL2026!',
    database: 'railway',
    connectTimeout: 30000,
};

async function run() {
    const conn = await mysql.createConnection(gcpDbConfig);
    console.log('=== GCP Cloud SQL — Live Verification ===\n');

    // 1. List all tables
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`📋 Total tables in database: ${tables.length}`);
    tables.forEach(t => {
        const name = Object.values(t)[0];
        console.log(`   • ${name}`);
    });

    // 2. Check new schema tables + row counts
    console.log('\n--- New Schema Tables ---');
    for (const tbl of ['vehicle_master', 'service_history', 'invoices']) {
        try {
            const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) as cnt FROM ${tbl}`);
            const [cols] = await conn.query(`SHOW COLUMNS FROM ${tbl}`);
            const [idxs] = await conn.query(`SHOW INDEX FROM ${tbl}`);
            const uniqueIdxNames = [...new Set(idxs.map(i => i.Key_name))];
            console.log(`\n  ✅ ${tbl}`);
            console.log(`     Columns: ${cols.length}`);
            console.log(`     Rows: ${cnt}`);
            console.log(`     Indexes: ${uniqueIdxNames.join(', ')}`);
        } catch (e) {
            console.log(`\n  ❌ ${tbl} — ${e.message}`);
        }
    }

    // 3. Existing migrated data
    console.log('\n--- Migrated Data (job_card_master) ---');
    const [[{ total }]] = await conn.query('SELECT COUNT(*) as total FROM job_card_master');
    const [[{ active }]] = await conn.query(`SELECT COUNT(*) as active FROM job_card_master WHERE job_status IN ('Unassigned','In Progress','Carry Forward')`);
    console.log(`  Total job cards: ${total}`);
    console.log(`  Active job cards: ${active}`);

    // 4. FK constraint check
    console.log('\n--- Foreign Key Constraints ---');
    const [fks] = await conn.query(`
        SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = 'railway' 
          AND REFERENCED_TABLE_NAME = 'vehicle_master'
    `);
    if (fks.length > 0) {
        fks.forEach(fk => console.log(`  ✅ ${fk.TABLE_NAME}.${fk.CONSTRAINT_NAME} → ${fk.REFERENCED_TABLE_NAME}`));
    } else {
        console.log('  (none found)');
    }

    console.log('\n=== Verification Complete ===');
    await conn.end();
}

run().catch(e => console.error('❌ Verification failed:', e));
