const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const https = require('https');

const dbConfig = {
  host: '35.200.150.167',
  port: 3306,
  user: 'root',
  password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
  database: 'railway',
};

const prodHost = 'wms-workshop-app-npoyvb3q7a-el.a.run.app';

const roleMappings = {
  'developer': { username: 'developer', password: 'developer' },
  'admin': { username: 'admin', password: 'Admin@DWIP2026' },
  'dealer_principal': { username: 'vitthal', password: 'password123' },
  'workshop_manager': { username: 'AHMED', password: 'password123' },
  'floor_supervisor': { username: 'RAGU', password: 'password123' },
  'service_advisor': { username: 'mustafa', password: 'password123' },
  'technician': { username: 'technician', password: 'Tech@DWIP2026' },
  'cashier': { username: 'shivkumar', password: 'password123' },
  'warranty': { username: 'chetan', password: 'password123' },
  'billing': { username: 'qadeer', password: 'password123' }
};

// Function to call HTTPS login endpoint
function testLogin(username, password) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ username, password });
    const options = {
      hostname: prodHost,
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', (e) => {
      resolve({ error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

async function verifyAll() {
  console.log("=== 1. VERIFYING ROLES LOGIN ===");
  const results = {};
  for (const [role, creds] of Object.entries(roleMappings)) {
    console.log(`Testing role "${role}" (username: "${creds.username}")...`);
    const res = await testLogin(creds.username, creds.password);
    results[role] = {
      username: creds.username,
      statusCode: res.statusCode,
      success: res.statusCode === 200,
      tokenPresent: !!(res.data && res.data.token),
      mappedRole: res.data && res.data.user ? res.data.user.role : null,
      full_name: res.data && res.data.user ? res.data.user.full_name : null,
      error: res.data && res.data.error ? res.data.error : null
    };
  }
  console.table(results);

  console.log("\n=== 2. VERIFYING INVALID CREDENTIALS ===");
  const invalidRes = await testLogin('developer', 'wrongpassword');
  console.log(`Test with wrong password: Status: ${invalidRes.statusCode}, Error: ${JSON.stringify(invalidRes.data)}`);

  const nonExistentRes = await testLogin('nonexistentuser', 'password123');
  console.log(`Test with nonexistent user: Status: ${nonExistentRes.statusCode}, Error: ${JSON.stringify(nonExistentRes.data)}`);

  console.log("\n=== 3. VERIFYING DEACTIVATED/LOCKED USERS ===");
  // Let's connect to database to find if there are any deactivated users (is_active = 0)
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [deactivatedUsers] = await connection.query("SELECT username, role, is_active FROM users WHERE is_active = 0 OR is_active = false");
    console.log("Deactivated users in users table:", deactivatedUsers.length);
    if (deactivatedUsers.length > 0) {
      console.table(deactivatedUsers);
      // Try logging in as the first deactivated user if we know password
      const lockedUser = deactivatedUsers[0].username;
      console.log(`Testing login for locked user "${lockedUser}"...`);
      const lockedRes = await testLogin(lockedUser, 'password123');
      console.log(`Locked user login status: ${lockedRes.statusCode}, Body: ${JSON.stringify(lockedRes.data)}`);
    } else {
      console.log("No deactivated users found in DB.");
    }
  } catch (err) {
    console.error("Error querying locked users:", err.message);
  } finally {
    await connection.end();
  }
}

verifyAll();
