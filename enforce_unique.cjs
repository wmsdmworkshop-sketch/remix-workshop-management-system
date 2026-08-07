require('dotenv').config();
const mysql = require('mysql2/promise');

async function enforceUniqueConstraints() {
    let pool;
    let retries = 5;
    while (retries > 0) {
        try {
            pool = mysql.createPool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                ssl: { rejectUnauthorized: false },
                connectTimeout: 20000 // Increase timeout to handle slow proxy
            });

            console.log("Adding UNIQUE constraint to vehicle_master.chassis_number...");
            await pool.query('ALTER TABLE vehicle_master ADD UNIQUE INDEX idx_unique_chassis (chassis_number);');
            console.log("Success: vehicle_master.chassis_number is now UNIQUE.");

            console.log("Adding UNIQUE constraint to user_access_master.username...");
            // user_access_master might not exist as a base table or might already have it, wrap in try/catch
            try {
                await pool.query('ALTER TABLE user_access_master ADD UNIQUE INDEX idx_unique_username (username);');
                console.log("Success: user_access_master.username is now UNIQUE.");
            } catch(e) {
                if (e.code === 'ER_DUP_KEYNAME') console.log("user_access_master.username is already UNIQUE.");
                else console.log("user_access_master error: " + e.message);
            }

            break;
        } catch (e) {
            console.error(`Attempt failed: ${e.message}`);
            retries--;
            if (retries === 0) console.error("All retries exhausted.");
            else await new Promise(res => setTimeout(res, 3000));
        } finally {
            if (pool) await pool.end();
        }
    }
}

enforceUniqueConstraints();
