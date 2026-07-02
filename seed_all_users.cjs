const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const conn = mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
});

const users = [
    { full_name: 'Developer', username: 'developer', password: 'Dev@DWIP2026', role: 'developer' },
    { full_name: 'Workshop Admin', username: 'admin', password: 'Admin@DWIP2026', role: 'admin' },
    { full_name: 'Service Manager', username: 'manager', password: 'Manager@DWIP2026', role: 'service_manager' },
    { full_name: 'Supervisor', username: 'supervisor', password: 'Super@DWIP2026', role: 'supervisor' },
    { full_name: 'Accounts', username: 'accounts', password: 'Accts@DWIP2026', role: 'accounts' },
    { full_name: 'Service Advisor', username: 'advisor', password: 'Advsr@DWIP2026', role: 'service_advisor' },
    { full_name: 'Reception', username: 'reception', password: 'Recep@DWIP2026', role: 'reception' },
    { full_name: 'Gate Personnel', username: 'gate', password: 'Gate@DWIP2026', role: 'gate_personnel' },
    { full_name: 'Technician', username: 'technician', password: 'Tech@DWIP2026', role: 'technician' },
    { full_name: 'Spare Parts', username: 'spareparts', password: 'Parts@DWIP2026', role: 'spare_parts' },
    { full_name: 'Warranty', username: 'warranty', password: 'Wrnty@DWIP2026', role: 'warranty' },
    { full_name: 'Cashier', username: 'cashier', password: 'Cash@DWIP2026', role: 'cashier' }
];

(async () => {
    // Clear existing users first
    conn.query('DELETE FROM users', async (e) => {
        if (e) console.log('DELETE ERROR:', e.message);
        else console.log('✅ Old users cleared!');

        for (const u of users) {
            const hash = await bcrypt.hash(u.password, 10);
            await new Promise((res) => {
                conn.query(
                    `INSERT INTO users 
            (full_name, username, password_hash, role) 
           VALUES (?, ?, ?, ?)`,
                    [u.full_name, u.username, hash, u.role],
                    (e, r) => {
                        if (e) console.log(`ERROR ${u.role}:`, e.message);
                        else console.log(`✅ ${u.role} → ${u.username} created! ID: ${r.insertId}`);
                        res();
                    }
                );
            });
        }
        conn.end();
    });
})();