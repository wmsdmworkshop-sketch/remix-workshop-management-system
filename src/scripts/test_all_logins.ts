import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const DEPLOY_URL = "https://dwip-enterprise-772298398554.asia-south1.run.app";

async function testAllLogins() {
  console.log("Starting Login Test for All Roles...");

  if (!process.env.DB_PASSWORD || process.env.DB_DATABASE === "railway") {
    throw new Error("Must provide explicit DB_PASSWORD and use a non-production DB_DATABASE.");
  }
  
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'wms_test',
    port: 3306
  });
  
  try {
    // Get one user per role
    const [users]: any = await conn.execute(`
      SELECT * FROM (
        SELECT username, user_role, password_hash,
               ROW_NUMBER() OVER(PARTITION BY user_role ORDER BY user_id) as rn
        FROM user_access_master
        WHERE is_active = 1
      ) t
      WHERE rn = 1
    `);
    
    console.log(`Found ${users.length} unique roles to test.`);
    
    const testPassword = "password123";
    const testPasswordHash = await bcrypt.hash(testPassword, 10);
    
    const results = [];
    
    for (const user of users) {
      console.log(`Testing role: ${user.user_role} with user: ${user.username}`);
      
      // Temporarily update password
      await conn.execute(
        "UPDATE user_access_master SET password_hash = ? WHERE username = ?",
        [testPasswordHash, user.username]
      );
      
      try {
        // Attempt login
        const response = await fetch(`${DEPLOY_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            password: testPassword
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
          results.push({ role: user.user_role, user: user.username, status: "PASSED" });
          console.log(`✅ PASSED: ${user.user_role}`);
        } else {
          results.push({ role: user.user_role, user: user.username, status: "FAILED", error: data.error || data.message });
          console.log(`❌ FAILED: ${user.user_role}`, data);
        }
      } catch (err: any) {
        results.push({ role: user.user_role, user: user.username, status: "ERROR", error: err.message });
        console.log(`❌ ERROR: ${user.user_role}`, err.message);
      } finally {
        // Restore original password hash
        await conn.execute(
          "UPDATE user_access_master SET password_hash = ? WHERE username = ?",
          [user.password_hash, user.username]
        );
      }
    }
    
    console.log("\n=====================================");
    console.log("LOGIN TEST SUMMARY");
    console.log("=====================================");
    console.table(results);
    
  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    await conn.end();
  }
}

testAllLogins();
