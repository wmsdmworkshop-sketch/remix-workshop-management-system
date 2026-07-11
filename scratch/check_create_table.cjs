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
            conn.query(`SHOW CREATE TABLE ${table}`, (err, rows) => {
                if (err) {
                    console.error(`Failed to show create table for ${table}:`, err.message);
                } else {
                    console.log(`\n=== CREATE TABLE ${table} ===`);
                    console.log(rows[0]['Create Table']);
                }
                resolve();
            });
        });
    }
    conn.end();
})();
