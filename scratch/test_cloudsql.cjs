const mysql = require('mysql2/promise');

async function test() {
    const config = {
        host: '35.200.150.167',
        user: 'root',
        password: 'WmsSecureMySQL2026!',
        database: 'railway',
        port: 3306
    };

    let conn;
    try {
        conn = await mysql.createConnection(config);
        console.log('Successfully connected to Cloud SQL!');
        
        const [databases] = await conn.query('SHOW DATABASES');
        console.log('Databases:', databases.map(d => d.Database));

        const [tables] = await conn.query('SHOW TABLES');
        console.log('Tables in railway:', tables.map(t => Object.values(t)[0]));

        if (tables.some(t => Object.values(t)[0] === 'user_access_master')) {
            const [users] = await conn.query('SELECT user_id, username, role FROM user_access_master');
            console.log('Users in user_access_master:', users);
        } else {
            console.log('user_access_master TABLE DOES NOT EXIST!');
        }

    } catch (e) {
        console.error('Error during DB test:', e);
    } finally {
        if (conn) await conn.end();
    }
}

test();
