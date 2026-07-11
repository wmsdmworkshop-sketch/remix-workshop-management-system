/**
 * API Verification - record_status and roles
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
  const loginRes = await api('POST', '/api/auth/login', { username: 'admin', password: 'Admin@DWIP2026' });
  const token = loginRes.data.token;

  const empRes = await api('GET', '/api/employees', null, token);
  if (empRes.ok && Array.isArray(empRes.data)) {
    console.log(`Total employees fetched: ${empRes.data.length}`);
    const canonicals = empRes.data.filter(e => e.record_status === 'CANONICAL');
    const legacies = empRes.data.filter(e => e.record_status === 'LEGACY');
    console.log(`Canonical employees: ${canonicals.length}`);
    console.log(`Legacy employees: ${legacies.length}`);
    
    console.log('\n--- Legacy Employees list ---');
    legacies.forEach(l => {
      console.log(`  id=${l.employee_id}, name=${l.full_name}, code=${l.employee_code}, role=${l.role}, status=${l.record_status}`);
    });

    console.log('\n--- Mustafa & Shashi Details ---');
    const targetIds = [7, 12, 22, 29];
    empRes.data.forEach(e => {
      if (targetIds.includes(e.employee_id)) {
        console.log(`  id=${e.employee_id}, name=${e.full_name}, code=${e.employee_code}, role=${e.role}, status=${e.record_status}`);
      }
    });
  }
}

run().catch(console.error);
