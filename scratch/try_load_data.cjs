const mysql = require('mysql2');
const conn = mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway',
    multipleStatements: true
});

(async () => {
    console.log("Attempting to set GLOBAL local_infile = 1...");
    conn.query("SET GLOBAL local_infile = 1", (err) => {
        if (err) {
            console.error("SET GLOBAL local_infile failed:", err.message);
        } else {
            console.log("Successfully set GLOBAL local_infile = 1");
        }
        conn.end();
    });
})();
