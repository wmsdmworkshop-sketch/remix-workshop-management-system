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
    console.log('=== INDEXES INVENTORY ===');
    const tablesToCheck = [
      'employees', 'users', 'user_access_master', 'job_cards', 'job_card_master',
      'vehicle_master', 'service_history', 'invoices', 'breakdowns', 'job_revenue_split'
    ];
    for (const t of tablesToCheck) {
      const [indexes] = await connection.query(`SHOW INDEX FROM \`${t}\``);
      console.log(`\nIndexes for Table: ${t}`);
      indexes.forEach(idx => {
        console.log(`  Name: ${idx.Key_name}, Unique: ${idx.Non_unique === 0}, Column: ${idx.Column_name}`);
      });
    }

    console.log('\n=== FOREIGN KEYS INVENTORY ===');
    const [fkRows] = await connection.query(`
      SELECT 
        TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE
        TABLE_SCHEMA = 'railway' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    console.log(JSON.stringify(fkRows, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}

run();
