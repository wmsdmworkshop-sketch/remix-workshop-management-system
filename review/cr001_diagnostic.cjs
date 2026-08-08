/**
 * Quick diagnostic: Check Mustafa's employee_id linkage
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
  const r = await api('POST', '/api/auth/login', { username: 'admin', password: process.env.ADMIN_PASSWORD });
  const token = r.data.token;

  // Get users to find Mustafa
  const usersRes = await api('GET', '/api/users', null, token);
  const mustafaUser = usersRes.data.find(u => u.username?.includes('mustafa') || u.full_name?.toUpperCase()?.includes('MUSTAFA'));
  console.log('=== MUSTAFA USER RECORD ===');
  console.log(JSON.stringify(mustafaUser, null, 2));

  // Get employees to find Mustafa
  const empRes = await api('GET', '/api/employees', null, token);
  console.log(`\nTotal employees: ${empRes.data.length}`);
  
  // Search by name and by employee_id
  const mustafaEmps = empRes.data.filter(e => 
    e.full_name?.toUpperCase()?.includes('MUSTAFA') || 
    (mustafaUser && e.employee_id === mustafaUser.employee_id)
  );
  console.log('\n=== MUSTAFA EMPLOYEE RECORDS ===');
  for (const emp of mustafaEmps) {
    console.log(JSON.stringify({
      employee_id: emp.employee_id,
      full_name: emp.full_name,
      employee_code: emp.employee_code,
      role: emp.role,
      designation: emp.designation,
      is_active: emp.is_active
    }, null, 2));
  }

  // Check Shashi too
  const shashiEmps = empRes.data.filter(e => e.full_name?.toUpperCase()?.includes('SHASHI'));
  console.log('\n=== SHASHI EMPLOYEE RECORDS ===');
  for (const emp of shashiEmps) {
    console.log(JSON.stringify({
      employee_id: emp.employee_id,
      full_name: emp.full_name,
      employee_code: emp.employee_code,
      role: emp.role,
      is_active: emp.is_active
    }, null, 2));
  }

  // Check Shashi user account
  const shashiUsers = usersRes.data.filter(u => 
    u.full_name?.toUpperCase()?.includes('SHASHI') || 
    u.username?.includes('shashi')
  );
  console.log('\n=== SHASHI USER RECORDS ===');
  for (const u of shashiUsers) {
    console.log(JSON.stringify({
      user_id: u.user_id,
      username: u.username,
      full_name: u.full_name,
      role: u.role,
      employee_id: u.employee_id,
      is_active: u.is_active
    }, null, 2));
  }

  // List all available API routes by testing common endpoints
  console.log('\n=== ENDPOINT AVAILABILITY ===');
  const endpoints = [
    '/api/job-cards',
    '/api/employees',
    '/api/users',
    '/api/breakdowns',
    '/api/vehicle/history?vrn=test',
    '/api/permissions',
    '/api/dashboard/stats',
    '/api/bays',
  ];
  for (const ep of endpoints) {
    const r = await api('GET', ep, null, token);
    console.log(`  ${ep} => ${r.status} (${typeof r.data === 'object' ? (Array.isArray(r.data) ? `${r.data.length} items` : 'object') : 'html/text'})`);
  }

  // Check role codes in employees table
  const roleCodes = [...new Set(empRes.data.map(e => e.role))];
  console.log('\n=== EMPLOYEE ROLE CODES ===');
  console.log(roleCodes);
}

run().catch(console.error);
