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
    const [shInt] = await connection.query("SELECT COUNT(*) as count FROM service_history WHERE sh_no LIKE 'SH-Int-%'");
    const [shOther] = await connection.query("SELECT COUNT(*) as count FROM service_history WHERE sh_no NOT LIKE 'SH-Int-%'");
    const [sampleOther] = await connection.query("SELECT * FROM service_history WHERE sh_no NOT LIKE 'SH-Int-%' LIMIT 3");
    
    console.log('Correct SH-Int-% rows:', shInt[0].count);
    console.log('Incorrect/Other rows:', shOther[0].count);
    console.log('Sample of other rows:', JSON.stringify(sampleOther, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
