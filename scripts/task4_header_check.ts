/**
 * Quick header check — test CSP on multiple endpoints
 */
const BASE = "http://localhost:3001";

async function check() {
  const endpoints = [
    "/api/health",
    "/api/auth/login"
  ];

  for (const ep of endpoints) {
    try {
      const r = await fetch(`${BASE}${ep}`, { method: ep.includes("login") ? "OPTIONS" : "GET" });
      const csp = r.headers.get("content-security-policy");
      const xct = r.headers.get("x-content-type-options");
      const xfr = r.headers.get("x-frame-options");
      const ref = r.headers.get("referrer-policy");
      const xss = r.headers.get("x-xss-protection");
      const enc = r.headers.get("content-encoding");
      console.log(`\n${ep} — HTTP ${r.status}`);
      console.log(`  x-content-type-options: ${xct}`);
      console.log(`  x-frame-options:        ${xfr}`);
      console.log(`  x-xss-protection:       ${xss}`);
      console.log(`  referrer-policy:        ${ref}`);
      console.log(`  content-security-policy:${csp ? " PRESENT ✅" : " MISSING ❌"}`);
      console.log(`    ${csp?.substring(0, 80) || "(none)"}`);
      console.log(`  content-encoding:       ${enc ?? "none"}`);
    } catch (e: any) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  // Also test a large response to see compression
  const loginR = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "developer", password: "developer" })
  });
  const token = (await loginR.json() as any).token;

  if (token) {
    const r2 = await fetch(`${BASE}/api/employees`, {
      headers: { Authorization: `Bearer ${token}`, "Accept-Encoding": "gzip" }
    });
    const csp2 = r2.headers.get("content-security-policy");
    const enc2 = r2.headers.get("content-encoding");
    console.log(`\n/api/employees (large response, gzip requested) — HTTP ${r2.status}`);
    console.log(`  content-security-policy: ${csp2 ? "PRESENT ✅" : "MISSING ❌"}`);
    console.log(`  content-encoding: ${enc2 ?? "none"}`);
    console.log(`  All headers:`);
    r2.headers.forEach((v, k) => console.log(`    ${k}: ${v}`));
  }
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
