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
        console.log(`\n=== Schema of ${table} ===`);
        await new Promise((resolve) => {
            conn.query(`DESCRIBE ${table}`, (err, rows) => {
                if (err) {
                    console.error(`Failed to describe ${table}:`, err.message);
                } else {
                    console.table(rows.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Key: r.Key, Default: r.Default })));
                }
                resolve();
            });
        });
    }
    conn.end();
})();
