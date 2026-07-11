/**
 * RBAC Verification Script - Login, JWT, Permissions
 */

const BASE = 'http://localhost:3001';

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  try { return { status: res.status, ok: res.ok, data: JSON.parse(text) }; }
  catch { return { status: res.status, ok: res.ok, data: text.substring(0, 200) }; }
}

async function run() {
  console.log('=== STEP 6: RBAC VALIDATION ===');

  // Test admin
  console.log('\nTesting Admin login...');
  const adminRes = await api('POST', '/api/auth/login', { username: 'admin', password: 'Admin@DWIP2026' });
  if (adminRes.ok) {
    const token = adminRes.data.token;
    const meRes = await api('GET', '/api/auth/me', null, token);
    console.log(`  Admin User role in JWT: ${adminRes.data.user.role}`);
    console.log(`  Admin permissions count: ${meRes.data.permissions.length}`);
  }

  // Test Mustafa (Service Advisor)
  console.log('\nTesting Mustafa (service_advisor) login...');
  let mRes = await api('POST', '/api/auth/login', { username: 'mustafa', password: 'password123' });
  if (!mRes.ok) {
    mRes = await api('POST', '/api/auth/login', { username: 'mustafa', password: 'Mustafa@123' });
  }
  if (mRes.ok) {
    const token = mRes.data.token;
    const meRes = await api('GET', '/api/auth/me', null, token);
    console.log(`  Mustafa User role in JWT: ${mRes.data.user.role}`);
    console.log(`  Mustafa permissions:`, meRes.data.permissions.map(p => `${p.module_name}(view=${p.can_view},edit=${p.can_edit})`));
  }
}

run().catch(console.error);
