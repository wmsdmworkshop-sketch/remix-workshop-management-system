const mysql = require('mysql2');
const conn = mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
});

const verifyQuery = `
    SELECT 'vehicle_master' AS tbl, COUNT(*) AS \`rows\` FROM vehicle_master
    UNION ALL
    SELECT 'service_history' AS tbl, COUNT(*) AS \`rows\` FROM service_history
    UNION ALL
    SELECT 'invoices' AS tbl, COUNT(*) AS \`rows\` FROM invoices;
`;

conn.query(verifyQuery, (err, rows) => {
    if (err) {
        console.error("Verification failed:", err.message);
    } else {
        console.log("\n--- Verification of Database Row Counts ---");
        console.table(rows);
    }
    conn.end();
});
