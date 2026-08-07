const mysql = require('mysql2/promise');

const railwayDbConfig = {
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
};

async function run() {
    let conn;
    try {
        conn = await mysql.createConnection(railwayDbConfig);
        const [[{cnt}]] = await conn.query('SELECT COUNT(*) as cnt FROM job_card_master');
        console.log('Total Rows in job_card_master (Railway):', cnt);
        
        const [[{active}]] = await conn.query(`
            SELECT COUNT(*) as active 
            FROM job_card_master 
            WHERE job_status IN ('Unassigned', 'In Progress', 'Carry Forward')
        `);
        console.log('Active Job Cards in job_card_master (Railway):', active);
    } catch (e) {
        console.error(e);
    } finally {
        if (conn) await conn.end();
    }
}

run();
