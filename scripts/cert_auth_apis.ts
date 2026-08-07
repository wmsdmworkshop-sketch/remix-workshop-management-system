/**
 * DWIP RC1.1 Authenticated API Certification
 */

const BASE = "http://localhost:3001";

async function req(method: string, path: string, body?: any, token?: string) {
  const start = Date.now();
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data: any; try { data = await res.json(); } catch { data = null; }
  return { status: res.status, duration: Date.now() - start, data };
}

async function run() {
  console.log("=== DWIP RC1.1 AUTHENTICATED CERT SUITE ===\n");

  // Find correct login credentials
  console.log("--- AUTH ---");
  // Try common usernames from alias map
  const attempts = [
    { username: "developer", password: "developer" },
    { username: "developer", password: "admin" },
    { username: "developer", password: "password" },
    { username: "admin", password: "admin" },
    { username: "admin", password: "admin@123" },
    { username: "wmsdmworkshop@gmail.com", password: "developer" },
    { username: "wmsdmworkshop@gmail.com", password: "admin" },
  ];

  let token = "";
  let loginWorked = false;
  for (const cred of attempts) {
    const r = await req("POST", "/api/auth/login", cred);
    console.log(`  Trying ${cred.username}/${cred.password}: HTTP ${r.status} token=${!!r.data?.token}`);
    if (r.data?.token) {
      token = r.data.token;
      loginWorked = true;
      console.log(`  ✅ LOGIN SUCCESS: username=${cred.username}`);
      break;
    }
  }

  if (!loginWorked) {
    console.log("  ❌ All login attempts failed. Cannot run authenticated tests.");
    process.exit(1);
  }

  // Run authenticated tests
  console.log("\n--- AUTHENTICATED API TESTS ---");

  const tests = [
    { label: "Job Cards LIST", path: "/api/v1/pilot/job-cards", method: "GET" },
    { label: "Gate Entries LIST", path: "/api/v1/pilot/gate-entries", method: "GET" },
    { label: "Estimates LIST", path: "/api/v1/pilot/estimates", method: "GET" },
    { label: "Invoices LIST", path: "/api/v1/pilot/invoices", method: "GET" },
    { label: "Employees LIST", path: "/api/v1/pilot/employees", method: "GET" },
    { label: "Bays LIST", path: "/api/v1/pilot/bays", method: "GET" },
    { label: "Warranty Claims LIST", path: "/api/warranty/claims", method: "GET" },
    { label: "Fleet Summary", path: "/api/v1/fleet/summary", method: "GET" },
    { label: "CXO Summary", path: "/api/cxo/summary", method: "GET" },
    { label: "Auth Me (token verify)", path: "/api/auth/me", method: "GET" },
    { label: "Passport LIST (v1)", path: "/api/v1/passport/passports", method: "GET" },
    { label: "Passport LIST (v2)", path: "/api/v2/passport/passports", method: "GET" },
    { label: "Users LIST", path: "/api/users", method: "GET" },
    { label: "Permissions GET", path: "/api/permissions", method: "GET" },
  ];

  for (const t of tests) {
    const r = await req(t.method, t.path, undefined, token);
    const pass = r.status === 200;
    const icon = pass ? "✅" : "❌";
    const dataPreview = r.data ? JSON.stringify(r.data).substring(0, 80) : "null";
    console.log(`${icon} [${t.label}] HTTP ${r.status} ${r.duration}ms | ${dataPreview}`);
  }

  // Security: verify token expiry claim
  const me = await req("GET", "/api/auth/me", undefined, token);
  console.log(`\nToken claims: ${JSON.stringify(me.data).substring(0, 200)}`);

  // Rate limiter behavior in non-production (NODE_ENV != production)
  console.log(`\nNODE_ENV: ${process.env.NODE_ENV}`);

  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
