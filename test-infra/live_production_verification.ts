import fetch from 'node-fetch';

const BASE_URL = "https://remix-workshop-management-system-772298398554.asia-south1.run.app";

async function runLiveVerification() {
  console.log("=================================================");
  console.log("🌐 LIVE CLOUD RUN PRODUCTION AUTHENTICATION SUITE");
  console.log(`Target URL: ${BASE_URL}`);
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  async function testLogin(label: string, payload: any, expectedStatus: number) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json() as any;
      const ok = res.status === expectedStatus;

      if (ok) {
        console.log(`✅ [PASS] ${label} (HTTP ${res.status})`);
        passed++;
        return data;
      } else {
        console.log(`❌ [FAIL] ${label} - Expected HTTP ${expectedStatus}, got HTTP ${res.status}. Response:`, JSON.stringify(data));
        failed++;
        return null;
      }
    } catch (err: any) {
      console.log(`❌ [FAIL] ${label} - Exception: ${err.message}`);
      failed++;
      return null;
    }
  }

  // 1. Developer Login
  const devRes = await testLogin("Developer Login (sayeed_dp)", { username: "sayeed_dp", password: process.env.TEST_USER_PASSWORD }, 200);

  // 2. Admin Login
  const adminRes = await testLogin("Admin Login (admin)", { username: "admin", password: process.env.TEST_USER_PASSWORD }, 200);

  // 3. Service Advisor Login
  const saRes = await testLogin("Service Advisor Login (shashi_sa)", { username: "shashi_sa", password: process.env.TEST_USER_PASSWORD }, 200);

  // 4. Invalid Password Test
  await testLogin("Invalid Password Rejection", { username: "sayeed_dp", password: "WrongPassword999" }, 401);

  // 5. Non-existent Account Test
  await testLogin("Non-existent Account Rejection", { username: "non_existent_user_9999", password: process.env.TEST_USER_PASSWORD }, 401);

  // 6. JWT Generation & /api/auth/me Verification
  if (devRes && devRes.token) {
    console.log("\n🔑 Verifying Live JWT Generation & /api/auth/me Endpoint...");
    try {
      const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${devRes.token}` }
      });
      const meData = await meRes.json() as any;
      if (meRes.status === 200 && meData.user && meData.user.username === "sayeed_dp") {
        console.log(`✅ [PASS] /api/auth/me Verification succeeded for user: ${meData.user.username} (Role: ${meData.user.role})`);
        passed++;
      } else {
        console.log(`❌ [FAIL] /api/auth/me Verification failed:`, JSON.stringify(meData));
        failed++;
      }
    } catch (e: any) {
      console.log(`❌ [FAIL] /api/auth/me Exception: ${e.message}`);
      failed++;
    }

    // 7. Permissions Endpoint Verification
    console.log("\n🛡️ Verifying Live /api/permissions Endpoint...");
    try {
      const permRes = await fetch(`${BASE_URL}/api/permissions`, {
        headers: { 'Authorization': `Bearer ${devRes.token}` }
      });
      const permData = await permRes.json() as any;
      if (permRes.status === 200 && Array.isArray(permData)) {
        console.log(`✅ [PASS] /api/permissions Endpoint returned ${permData.length} permission rules.`);
        passed++;
      } else {
        console.log(`❌ [FAIL] /api/permissions failed:`, JSON.stringify(permData));
        failed++;
      }
    } catch (e: any) {
      console.log(`❌ [FAIL] /api/permissions Exception: ${e.message}`);
      failed++;
    }
  }

  console.log("\n=================================================");
  console.log(`LIVE PRODUCTION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  process.exit(failed === 0 ? 0 : 1);
}

runLiveVerification();
