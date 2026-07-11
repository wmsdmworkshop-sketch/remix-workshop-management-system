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
            conn.query(`DESCRIBE ${table}`, (err, rows) => {
                if (err) {
                    console.error(`Failed to describe ${table}:`, err.message);
                } else {
                    console.log(`\n=== Columns of ${table} ===`);
                    console.log(rows.map(r => r.Field));
                }
                resolve();
            });
        });
    }
    conn.end();
})();
