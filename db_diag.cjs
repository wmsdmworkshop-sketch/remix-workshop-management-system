const mysql = require('./node_modules/mysql2/promise');
const bcrypt = require('./node_modules/bcryptjs');

async function main() {
  const conn = await mysql.createConnection({
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'WmsSecureMySQL2026!',
    database: 'railway'
  });

  console.log('=== Connected to Cloud SQL ===');

  // 1. users table
  console.log('\n--- users table (admin/developer) ---');
  const [users] = await conn.query(
    "SELECT user_id, username, full_name, role, is_active, LEFT(password_hash, 20) as hash_prefix, LENGTH(password_hash) as hash_len FROM users WHERE username IN ('admin', 'developer')"
  );
  console.table(users);

  // 2. user_access_master
  console.log('\n--- user_access_master search ---');
  try {
    const [uam] = await conn.query(
      "SELECT user_id, username, email, user_role, is_active, LEFT(password_hash, 20) as hash_prefix, LENGTH(password_hash) as hash_len FROM user_access_master WHERE LOWER(username) IN ('admin', 'developer') OR LOWER(email) IN ('admin', 'developer', 'wmsdmworkshop@gmail.com')"
    );
    if (uam.length > 0) {
      console.log('FOUND rows in user_access_master:');
      console.table(uam);
    } else {
      console.log('No admin/developer rows in user_access_master');
    }
  } catch (e) {
    console.log('user_access_master error:', e.message);
  }

  // 3. bcrypt verify admin in users
  const [adminRow] = await conn.query("SELECT password_hash FROM users WHERE username = 'admin'");
  if (adminRow.length > 0) {
    console.log('\n--- bcrypt verify: admin (users table) ---');
    console.log('Admin@DWIP2026:', await bcrypt.compare('Admin@DWIP2026', adminRow[0].password_hash));
    console.log('admin123:', await bcrypt.compare('admin123', adminRow[0].password_hash));
    console.log('password123:', await bcrypt.compare('password123', adminRow[0].password_hash));
  }

  // 4. bcrypt verify developer in users
  const [devRow] = await conn.query("SELECT password_hash FROM users WHERE username = 'developer'");
  if (devRow.length > 0) {
    console.log('\n--- bcrypt verify: developer (users table) ---');
    console.log('Dev@DWIP2026:', await bcrypt.compare('Dev@DWIP2026', devRow[0].password_hash));
    console.log('password123:', await bcrypt.compare('password123', devRow[0].password_hash));
  }

  // 5. Check UAM for wmsdmworkshop (developer alias target)
  try {
    const [sayeed] = await conn.query(
      "SELECT user_id, username, email, user_role, LEFT(password_hash, 20) as hash_prefix FROM user_access_master WHERE LOWER(email) = 'wmsdmworkshop@gmail.com' OR LOWER(username) = 'wmsdmworkshop@gmail.com'"
    );
    if (sayeed.length > 0) {
      console.log('\n--- UAM: wmsdmworkshop@gmail.com (developer alias) ---');
      console.table(sayeed);
      const hash = (await conn.query("SELECT password_hash FROM user_access_master WHERE LOWER(email) = 'wmsdmworkshop@gmail.com' OR LOWER(username) = 'wmsdmworkshop@gmail.com'"))[0][0]?.password_hash;
      if (hash) {
        console.log('Dev@DWIP2026:', await bcrypt.compare('Dev@DWIP2026', hash));
        console.log('password123:', await bcrypt.compare('password123', hash));
      }
    }
  } catch (e) {
    console.log('UAM wmsdmworkshop error:', e.message);
  }

  // 6. Row counts
  console.log('\n--- Row counts ---');
  const [uc] = await conn.query("SELECT COUNT(*) as c FROM users");
  console.log('users:', uc[0].c);
  try {
    const [uamc] = await conn.query("SELECT COUNT(*) as c FROM user_access_master");
    console.log('user_access_master:', uamc[0].c);
  } catch (e) {
    console.log('user_access_master:', e.message);
  }

  await conn.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
