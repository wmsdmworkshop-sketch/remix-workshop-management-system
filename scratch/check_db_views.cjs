const mysql = require('mysql2/promise');

async function run() {
  const host = "thomas.proxy.rlwy.net";
  const port = 50733;
  const user = "root";
  const password = "mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri";
  const database = "railway";

  const connection = await mysql.createConnection({
    host, port, user, password, database
  });

  try {
      const [tables] = await connection.query("SHOW FULL TABLES");
      console.log(tables);
  } catch (e) {
      console.error(e);
  } finally {
      await connection.end();
  }
}
run();
