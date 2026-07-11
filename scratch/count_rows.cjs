const mysql = require('mysql2');
const conn = mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
});

const tables = ['vehicle_master', 'service_history', 'invoices'];

(async () => {
    for (const table of tables) {
        await new Promise((resolve) => {
            conn.query(`SELECT COUNT(*) AS count FROM ${table}`, (err, rows) => {
                if (err) {
                    console.error(`Failed to count ${table}:`, err.message);
                } else {
                    console.log(`Current rows in ${table}:`, rows[0].count);
                }
                resolve();
            });
        });
    }
    conn.end();
})();
