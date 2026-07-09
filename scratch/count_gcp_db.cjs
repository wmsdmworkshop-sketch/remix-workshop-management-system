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
        const [[{cnt}]] = await conn.query('SELECT COUNT(*) as cnt FROM job_card_master');
        console.log('Total Rows in job_card_master (GCP):', cnt);
        
        const [[{active}]] = await conn.query(`
            SELECT COUNT(*) as active 
            FROM job_card_master 
            WHERE job_status IN ('Unassigned', 'In Progress', 'Carry Forward')
        `);
        console.log('Active Job Cards in job_card_master (GCP):', active);
    } catch (e) {
        console.error(e);
    } finally {
        if (conn) await conn.end();
    }
}

run();
