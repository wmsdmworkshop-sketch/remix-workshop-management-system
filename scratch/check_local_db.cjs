const mysql = require('mysql2/promise');

async function testConnection(password) {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: password,
      database: 'railway'
    });
    console.log(`Connected successfully with password: "${password}"`);
    const [tables] = await conn.query("SHOW TABLES");
    console.log("Tables:", tables.map(t => Object.values(t)[0]));
    await conn.end();
    return true;
  } catch (e) {
    console.log(`Failed with password "${password}":`, e.message);
    return false;
  }
}

async function run() {
  const success = await testConnection('');
  if (!success) {
    await testConnection('root');
  }
}
run();
