const mysql = require('mysql2/promise');

async function compare() {
    const railwayConfig = {
        host: 'thomas.proxy.rlwy.net',
        port: 50733,
        user: 'root',
        password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
        database: 'railway'
    };

    const gcpConfig = {
        host: '35.200.150.167',
        port: 3306,
        user: 'root',
        password: 'WmsSecureMySQL2026!',
        database: 'railway'
    };

    let connRailway, connGcp;
    try {
        console.log('Connecting to Railway DB...');
        connRailway = await mysql.createConnection(railwayConfig);
        console.log('Connected to Railway!');

        console.log('Connecting to GCP Cloud SQL DB...');
        connGcp = await mysql.createConnection(gcpConfig);
        console.log('Connected to GCP!');

        // Query row counts from both for job_cards
        const [[{ cnt: railwayJC }]] = await connRailway.query('SELECT COUNT(*) as cnt FROM job_cards');
        const [[{ cnt: gcpJC }]] = await connGcp.query('SELECT COUNT(*) as cnt FROM job_cards');

        console.log(`\nJob Cards Count:`);
        console.log(`  Railway: ${railwayJC}`);
        console.log(`  GCP Cloud SQL: ${gcpJC}`);

        // Compare all tables
        const [tablesRailway] = await connRailway.query('SHOW TABLES');
        const rTables = tablesRailway.map(t => Object.values(t)[0]);

        console.log(`\nTable comparison (Railway count vs GCP count):`);
        for (const table of rTables) {
            try {
                const [[{ cnt: rCnt }]] = await connRailway.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
                let gCnt = 'N/A (Table missing)';
                try {
                    const [[{ cnt: g }]] = await connGcp.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
                    gCnt = g;
                } catch (e) {}
                
                if (rCnt !== gCnt) {
                    console.log(`❌ ${table}: Railway = ${rCnt} | GCP = ${gCnt}`);
                } else {
                    console.log(`✅ ${table}: ${rCnt} rows`);
                }
            } catch (e) {
                console.log(`⚠️ ${table}: Error checking count - ${e.message}`);
            }
        }

    } catch (e) {
        console.error('Error during comparison:', e);
    } finally {
        if (connRailway) await connRailway.end();
        if (connGcp) await connGcp.end();
    }
}

compare();
