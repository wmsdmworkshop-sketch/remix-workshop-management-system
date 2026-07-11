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
    console.log('=== TABLE COLUMN DETAILS ===');
    const tables = ['employees', 'employee_master', 'users', 'user_access_master', 'job_card_master', 'vehicle_master', 'service_history', 'invoices', 'role_permissions'];
    for (const t of tables) {
      const [columns] = await connection.query(`DESCRIBE \`${t}\``);
      console.log(`\nTable: ${t}`);
      columns.forEach(col => {
        console.log(`  Column: ${col.Field}, Type: ${col.Type}, Null: ${col.Null}, Key: ${col.Key}, Default: ${col.Default}`);
      });
    }

    console.log('\n=== NULL VALUES COUNT ===');
    for (const t of tables) {
      const [columns] = await connection.query(`DESCRIBE \`${t}\``);
      const nullChecks = columns.map(col => `SUM(CASE WHEN \`${col.Field}\` IS NULL THEN 1 ELSE 0 END) AS \`${col.Field}_nulls\``).join(', ');
      const [nullCounts] = await connection.query(`SELECT ${nullChecks} FROM \`${t}\``);
      console.log(`\nNull counts in table ${t}:`);
      console.log(nullCounts[0]);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
