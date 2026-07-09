const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'WmsSecureMySQL2026!',
    database: 'railway'
  });

  try {
      console.log("--- Sample from users ---");
      const [users] = await connection.query("SELECT * FROM users LIMIT 1");
      console.log(users[0]);

      console.log("--- Sample from employee_master ---");
      const [em] = await connection.query("SELECT * FROM employee_master LIMIT 1");
      console.log(em[0]);

      console.log("--- Sample from employees ---");
      const [emp] = await connection.query("SELECT * FROM employees LIMIT 1");
      console.log(emp[0]);
  } catch (e) {
      console.error(e);
  } finally {
      await connection.end();
  }
}
run();
