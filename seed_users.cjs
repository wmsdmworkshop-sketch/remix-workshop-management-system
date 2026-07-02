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
    {
        full_name: 'Developer',
        username: 'developer',
        password: 'Dev@DWIP2026',
        role: 'developer'
    },
    {
        full_name: 'Workshop Admin',
        username: 'admin',
        password: 'Admin@DWIP2026',
        role: 'admin'
    }
];

(async () => {
    for (const u of users) {
        const hash = await bcrypt.hash(u.password, 10);
        conn.query(
            `INSERT INTO users 
        (full_name, username, password_hash, role) 
       VALUES (?, ?, ?, ?)`,
            [u.full_name, u.username, hash, u.role],
            (e, r) => {
                if (e) console.log('ERROR:', e.message);
                else console.log(`✅ ${u.role} created! ID: ${r.insertId}`);
            }
        );
    }
    setTimeout(() => conn.end(), 2000);
})();