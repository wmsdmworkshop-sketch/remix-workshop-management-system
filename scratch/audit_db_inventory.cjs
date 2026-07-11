const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
  });

  try {
    console.log('=== 1. DATABASE TABLES INVENTORY ===');
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(JSON.stringify(tableNames, null, 2));

    console.log('\n=== 2. DATABASE VIEWS INVENTORY ===');
    const [views] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'VIEW'");
    console.log(JSON.stringify(views, null, 2));

    console.log('\n=== 3. TRIGGERS INVENTORY ===');
    const [triggers] = await connection.query('SHOW TRIGGERS');
    console.log(JSON.stringify(triggers, null, 2));

    console.log('\n=== 4. PROCEDURES INVENTORY ===');
    const [procedures] = await connection.query("SHOW PROCEDURE STATUS WHERE Db = 'railway'");
    console.log(JSON.stringify(procedures, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
