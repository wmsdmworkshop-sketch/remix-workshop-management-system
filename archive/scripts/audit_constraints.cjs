require('dotenv').config();
const mysql = require('mysql2/promise');

async function auditConstraints() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const [tables] = await pool.query(`
            SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = ? AND CONSTRAINT_TYPE IN ('UNIQUE', 'PRIMARY KEY')
        `, [process.env.DB_NAME]);

        console.log("=== DB CONSTRAINTS ===");
        const tableMap = {};
        for (const t of tables) {
            if (!tableMap[t.TABLE_NAME]) tableMap[t.TABLE_NAME] = [];
            tableMap[t.TABLE_NAME].push(`${t.CONSTRAINT_TYPE}: ${t.CONSTRAINT_NAME}`);
        }

        for (const [table, constraints] of Object.entries(tableMap)) {
            console.log(`\nTable: ${table}`);
            constraints.forEach(c => console.log(`  - ${c}`));
        }

    } catch (e) {
        console.error("Failed to query DB", e);
    } finally {
        await pool.end();
    }
}

auditConstraints();
