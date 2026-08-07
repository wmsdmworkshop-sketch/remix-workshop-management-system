require('dotenv').config();
const mysql = require('mysql2/promise');

async function queryUsers() {
    let pool;
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            port: process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        const [users] = await pool.query('SELECT username, role, is_active FROM users');
        console.log("=== USERS TABLE ===");
        console.table(users);

        const [accessUsers] = await pool.query('SELECT username, role, is_active FROM user_access_master');
        console.log("=== USER_ACCESS_MASTER TABLE ===");
        console.table(accessUsers);

    } catch (err) {
        console.error("Error querying db:", err);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}
queryUsers();
