/**
 * Test API Endpoints for Canonical Employee and Roles
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
  // Login as admin
  const loginRes = await api('POST', '/api/auth/login', { username: 'admin', password: 'Admin@DWIP2026' });
  if (!loginRes.ok) {
    console.error('Admin login failed:', loginRes.data);
    return;
  }
  const token = loginRes.data.token;
  console.log('Admin login successful.');

  // 1. Check /api/employees
  const empRes = await api('GET', '/api/employees', null, token);
  console.log('\n--- /api/employees ---');
  if (empRes.ok && Array.isArray(empRes.data)) {
    const canonicals = empRes.data.filter(e => e.record_status === 'CANONICAL');
    const legacies = empRes.data.filter(e => e.record_status === 'LEGACY');
    console.log(`Total: ${empRes.data.length}`);
    console.log(`Canonical count: ${canonicals.length}`);
    console.log(`Legacy count: ${legacies.length}`);
    legacies.forEach(l => {
      console.log(`  LEGACY: id=${l.employee_id}, name=${l.full_name}, role=${l.role}, code=${l.employee_code}`);
    });
    // Check if roles are normalized
    const mustafaCan = canonicals.find(c => c.employee_id === 12);
    console.log(`Mustafa (12) role: ${mustafaCan?.role}, record_status: ${mustafaCan?.record_status}`);
    const shashiCan = canonicals.find(c => c.employee_id === 7);
    console.log(`Shashi (7) role: ${shashiCan?.role}, record_status: ${shashiCan?.record_status}`);
  } else {
    console.error('Failed to fetch employees:', empRes.status);
  }

  // 2. Check /api/users
  const usersRes = await api('GET', '/api/users', null, token);
  console.log('\n--- /api/users ---');
  if (usersRes.ok && Array.isArray(usersRes.data)) {
    const mustafaUser = usersRes.data.find(u => u.username === 'mustafa');
    console.log(`Mustafa User: role=${mustafaUser?.role}, employee_id=${mustafaUser?.employee_id}`);
    const shashiUser = usersRes.data.find(u => u.username === 'sahsi');
    console.log(`Shashi User: role=${shashiUser?.role}, employee_id=${shashiUser?.employee_id}`);
  } else {
    console.error('Failed to fetch users:', usersRes.status);
  }

  // 3. Check /api/auth/me (using Mustafa's login)
  const mustafaLogin = await api('POST', '/api/auth/login', { username: 'mustafa', password: 'password123' });
  if (mustafaLogin.ok) {
    const mToken = mustafaLogin.data.token;
    const meRes = await api('GET', '/api/auth/me', null, mToken);
    console.log('\n--- /api/auth/me (Mustafa) ---');
    console.log(JSON.stringify(meRes.data, null, 2));
  } else {
    const mustafaLogin2 = await api('POST', '/api/auth/login', { username: 'mustafa', password: 'Mustafa@123' });
    if (mustafaLogin2.ok) {
      const mToken = mustafaLogin2.data.token;
      const meRes = await api('GET', '/api/auth/me', null, mToken);
      console.log('\n--- /api/auth/me (Mustafa alt password) ---');
      console.log(JSON.stringify(meRes.data, null, 2));
    }
  }

  // 4. Check Job Cards API
  const jcRes = await api('GET', '/api/job-cards', null, token);
  console.log('\n--- Job Cards API ---');
  if (jcRes.ok) {
    console.log(`Job cards status: ${jcRes.status}, data length: ${Array.isArray(jcRes.data) ? jcRes.data.length : 'Object'}`);
  }

  // 5. Check Breakdowns API
  const bdRes = await api('GET', '/api/breakdowns', null, token);
  console.log('\n--- Breakdowns API ---');
  if (bdRes.ok) {
    console.log(`Breakdowns status: ${bdRes.status}, count: ${bdRes.data.length}`);
  }

  // 6. Check Vehicle History API
  const vhRes = await api('GET', '/api/vehicle/history?vrn=MH12AB1234', null, token);
  console.log('\n--- Vehicle History API ---');
  console.log(`Vehicle History status: ${vhRes.status}`);
}

run().catch(console.error);
