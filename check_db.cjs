const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway',
    connectionLimit: 2,
    connectTimeout: 10000,
  });

  try {
    // 1. List all tables
    const [tables] = await pool.query('SHOW TABLES');
    console.log('=== TABLES IN DATABASE ===');
    console.log(tables.map(t => Object.values(t)[0]).join(', '));

    // 2. Check users table
    const [users] = await pool.query('SELECT username, role FROM users LIMIT 20');
    console.log('\n=== USERS ===');
    console.log(users);

    // 3. Check job_cards count
    try {
      const [jcCount] = await pool.query('SELECT COUNT(*) as cnt FROM job_cards');
      console.log('\n=== JOB CARDS COUNT ===');
      console.log(jcCount[0].cnt);
    } catch(e) {
      console.log('\n=== JOB CARDS ===');
      console.log('Table may not exist:', e.message);
    }

    // 4. Check if there are any other important tables with data
    for (const t of tables) {
      const tbl = Object.values(t)[0];
      try {
        const [cnt] = await pool.query(`SELECT COUNT(*) as cnt FROM \`${tbl}\``);
        console.log(`  ${tbl}: ${cnt[0].cnt} rows`);
      } catch(e) {
        console.log(`  ${tbl}: error - ${e.message}`);
      }
    }

  } catch(e) {
    console.error('Connection error:', e.message);
  } finally {
    await pool.end();
  }
}

check();
