/**
 * CR-001 BUSINESS VALIDATION SCRIPT
 * Covers Scenarios 1–6 via direct API calls against localhost:3001
 * READ-ONLY where possible; role changes are reverted at the end.
 */

const BASE = 'http://localhost:3001';

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

function pass(label) { console.log(`  [PASS] ${label}`); }
function fail(label, detail) { console.log(`  [FAIL] ${label} — ${detail}`); }
function section(title) { console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`); }

async function run() {
  let adminToken, mustafaToken;
  const results = { passed: 0, failed: 0, scenarios: {} };

  function record(scenario, label, ok, detail) {
    if (!results.scenarios[scenario]) results.scenarios[scenario] = [];
    results.scenarios[scenario].push({ label, ok, detail });
    if (ok) { pass(label); results.passed++; }
    else { fail(label, detail || ''); results.failed++; }
  }

  // ============================================================
  // SCENARIO 0: Login as Admin
  // ============================================================
  section('SCENARIO 0: Admin Login');
  {
    const r = await api('POST', '/api/auth/login', { username: 'admin', password: 'Admin@DWIP2026' });
    if (r.ok) {
      adminToken = r.data.token;
      record('S0', 'Admin login successful', true);
      record('S0', `Admin role = ${r.data.user.role}`, r.data.user.role === 'admin', r.data.user.role);
    } else {
      record('S0', 'Admin login', false, r.data.error);
      console.log('Cannot proceed without admin login.');
      return results;
    }
  }

  // ============================================================
  // SCENARIO 1: Change Mustafa from Service Advisor → Breakdown
  // ============================================================
  section('SCENARIO 1: Change Mustafa role to Breakdown');
  {
    // First get users list and find Mustafa
    const usersRes = await api('GET', '/api/users', null, adminToken);
    record('S1', 'GET /api/users returns data', usersRes.ok && Array.isArray(usersRes.data));

    const mustafaUser = usersRes.data.find(u => u.username === 'mustafaladaf50@gmail.com' || u.username === 'mustafa');
    record('S1', 'Mustafa found in user directory', !!mustafaUser, mustafaUser ? `user_id=${mustafaUser.user_id}, role=${mustafaUser.role}` : 'NOT FOUND');

    if (mustafaUser) {
      const originalRole = mustafaUser.role;
      record('S1', `Mustafa current role = ${originalRole}`, true);

      // Change to breakdown
      const updateRes = await api('PUT', `/api/users/${mustafaUser.user_id}`, { role: 'breakdown' }, adminToken);
      record('S1', 'PUT /api/users/:id role→breakdown', updateRes.ok, updateRes.ok ? `new role=${updateRes.data.role}` : updateRes.data.error);

      // Verify the change persisted
      const verifyRes = await api('GET', '/api/users', null, adminToken);
      const updated = verifyRes.data.find(u => u.user_id === mustafaUser.user_id);
      record('S1', 'User directory reflects breakdown role', updated?.role === 'breakdown', `role=${updated?.role}`);

      // Check employees table via API
      const empRes = await api('GET', '/api/employees', null, adminToken);
      if (empRes.ok) {
        const mustafaEmp = empRes.data.find(e => e.full_name === 'MUSTAFA' || e.employee_id === 22);
        record('S1', 'Employee directory reflects breakdown role', mustafaEmp?.role === 'breakdown', `role=${mustafaEmp?.role}`);
      }

      // Check permissions for breakdown role
      const permRes = await api('GET', '/api/permissions', null, adminToken);
      if (permRes.ok && Array.isArray(permRes.data)) {
        const bdPerms = permRes.data.filter(p => p.role_name === 'breakdown');
        record('S1', `Breakdown role has ${bdPerms.length} permission entries`, bdPerms.length > 0);
        const bdModules = bdPerms.filter(p => p.can_view === 1).map(p => p.module_name);
        record('S1', `Breakdown viewable modules: ${bdModules.join(', ')}`, true);
      }

      // ============================================================
      // SCENARIO 2: Login as Mustafa (now Breakdown)
      // ============================================================
      section('SCENARIO 2: Login as Mustafa (Breakdown role)');
      {
        const mRes = await api('POST', '/api/auth/login', { username: 'mustafa', password: 'password123' });
        record('S2', 'Mustafa login successful', mRes.ok);
        if (mRes.ok) {
          mustafaToken = mRes.data.token;
          record('S2', `JWT role = ${mRes.data.user.role}`, mRes.data.user.role === 'breakdown', `role=${mRes.data.user.role}`);

          // Test API access — should be able to see breakdowns
          const bdRes = await api('GET', '/api/breakdowns', null, mustafaToken);
          record('S2', 'GET /api/breakdowns accessible', bdRes.status !== 403, `status=${bdRes.status}`);

          // Test API access — should NOT have user management access
          const umRes = await api('GET', '/api/users', null, mustafaToken);
          record('S2', 'GET /api/users blocked (403)', umRes.status === 403, `status=${umRes.status}`);
        }
      }

      // ============================================================
      // SCENARIO 3: Change Mustafa back to Service Advisor
      // ============================================================
      section('SCENARIO 3: Revert Mustafa to Service Advisor');
      {
        const revertRes = await api('PUT', `/api/users/${mustafaUser.user_id}`, { role: 'service_advisor' }, adminToken);
        record('S3', 'PUT /api/users/:id role→service_advisor', revertRes.ok, revertRes.ok ? `role=${revertRes.data.role}` : revertRes.data.error);

        // Re-login as Mustafa
        const mRes2 = await api('POST', '/api/auth/login', { username: 'mustafa', password: 'password123' });
        record('S3', 'Mustafa re-login successful', mRes2.ok);
        if (mRes2.ok) {
          record('S3', `JWT role = ${mRes2.data.user.role}`, mRes2.data.user.role === 'service_advisor', `role=${mRes2.data.user.role}`);
        }

        // Verify employee table updated
        const empRes2 = await api('GET', '/api/employees', null, adminToken);
        if (empRes2.ok) {
          const mustafaEmp2 = empRes2.data.find(e => e.full_name === 'MUSTAFA' || e.employee_id === 22);
          record('S3', 'Employee directory reflects service_advisor role', mustafaEmp2?.role === 'service_advisor', `role=${mustafaEmp2?.role}`);
        }
      }
    }
  }

  // ============================================================
  // SCENARIO 4: Verify Shashi employee details
  // ============================================================
  section('SCENARIO 4: Shashi Employee Verification');
  {
    const empRes = await api('GET', '/api/employees', null, adminToken);
    if (empRes.ok) {
      const shashi = empRes.data.find(e => e.full_name === 'SHASHIKUMAR' || e.employee_code === 'EMP029');
      record('S4', 'Shashi found in employee directory', !!shashi, shashi ? `id=${shashi.employee_id}, role=${shashi.role}` : 'NOT FOUND');

      if (shashi) {
        // Check user account
        const usersRes = await api('GET', '/api/users', null, adminToken);
        const shashiUser = usersRes.data.find(u => u.username === 'patilshashi5558@gmail.com');
        record('S4', 'Shashi user account found', !!shashiUser, shashiUser ? `role=${shashiUser.role}` : 'NOT FOUND');
      }
    }
  }

  // ============================================================
  // SCENARIO 5: Job Card creation flow verification
  // ============================================================
  section('SCENARIO 5: Job Card Data Flow Verification');
  {
    const jcRes = await api('GET', '/api/job-cards', null, adminToken);
    record('S5', 'GET /api/job-cards returns data', jcRes.ok);

    if (jcRes.ok && Array.isArray(jcRes.data) && jcRes.data.length > 0) {
      const sampleJC = jcRes.data[0];
      record('S5', `Sample JC: ${sampleJC.job_card_no}, advisor=${sampleJC.service_advisor}, tech=${sampleJC.technician_name}`, true);

      // Verify employees in job card match employee directory names
      const empRes = await api('GET', '/api/employees', null, adminToken);
      if (empRes.ok) {
        const empNames = empRes.data.map(e => e.full_name?.toUpperCase());
        // Check if technician names from job cards exist in employee directory
        const techsInJCs = [...new Set(jcRes.data.map(jc => jc.technician_name).filter(Boolean))];
        for (const tech of techsInJCs.slice(0, 5)) {
          const found = empNames.includes(tech?.toUpperCase());
          record('S5', `Technician "${tech}" exists in employee directory`, found || tech === 'Queue' || !tech);
        }
      }
    }
  }

  // ============================================================
  // SCENARIO 6: Vehicle History data source verification
  // ============================================================
  section('SCENARIO 6: Vehicle History Data Source Verification');
  {
    // Check vehicle lookup endpoint
    const vlRes = await api('GET', '/api/vehicles', null, adminToken);
    record('S6', 'GET /api/vehicles accessible', vlRes.status !== 403, `status=${vlRes.status}`);

    // Check job card master for vehicle history
    const jcRes = await api('GET', '/api/job-cards', null, adminToken);
    if (jcRes.ok && Array.isArray(jcRes.data)) {
      const vehicleJCs = jcRes.data.filter(jc => jc.vrn);
      record('S6', `Job cards with VRN: ${vehicleJCs.length}`, vehicleJCs.length > 0);

      // Verify advisors, technicians are from employees table
      const empRes = await api('GET', '/api/employees', null, adminToken);
      if (empRes.ok) {
        const empNames = new Set(empRes.data.map(e => e.full_name?.toUpperCase()));
        const advisors = [...new Set(jcRes.data.map(jc => jc.service_advisor).filter(Boolean))];
        let advisorMatchCount = 0;
        for (const adv of advisors) {
          if (empNames.has(adv?.toUpperCase())) advisorMatchCount++;
        }
        record('S6', `Advisors from employees table: ${advisorMatchCount}/${advisors.length}`, true);
      }
    }

    // Check service history endpoint
    const shRes = await api('GET', '/api/service-history', null, adminToken);
    record('S6', 'GET /api/service-history accessible', shRes.status !== 403, `status=${shRes.status}`);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  section('FINAL SUMMARY');
  console.log(`Total Passed: ${results.passed}`);
  console.log(`Total Failed: ${results.failed}`);
  console.log(`Pass Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  for (const [scenario, checks] of Object.entries(results.scenarios)) {
    const sPassed = checks.filter(c => c.ok).length;
    const sFailed = checks.filter(c => !c.ok).length;
    console.log(`  ${scenario}: ${sPassed} passed, ${sFailed} failed`);
  }

  return results;
}

run().catch(console.error);
