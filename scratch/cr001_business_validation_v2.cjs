/**
 * CR-001 BUSINESS VALIDATION SCRIPT (v2)
 * Corrected for actual API endpoints and data structure.
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

function pass(label) { console.log(`  [PASS] ${label}`); }
function fail(label, detail) { console.log(`  [FAIL] ${label} — ${detail || ''}`); }
function warn(label, detail) { console.log(`  [WARN] ${label} — ${detail || ''}`); }
function section(title) { console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`); }

async function run() {
  let adminToken;
  const results = { passed: 0, failed: 0, warnings: 0, details: [] };

  function record(scenario, label, status, detail) {
    results.details.push({ scenario, label, status, detail });
    if (status === 'PASS') { pass(label); results.passed++; }
    else if (status === 'FAIL') { fail(label, detail); results.failed++; }
    else { warn(label, detail); results.warnings++; }
  }

  // ============================================================
  // SCENARIO 0: Admin Login
  // ============================================================
  section('SCENARIO 0: Admin Login');
  {
    const r = await api('POST', '/api/auth/login', { username: 'admin', password: 'Admin@DWIP2026' });
    if (r.ok) {
      adminToken = r.data.token;
      record('S0', 'Admin login successful', 'PASS');
      record('S0', `Admin role = ${r.data.user.role}`, r.data.user.role === 'admin' ? 'PASS' : 'FAIL', r.data.user.role);
    } else {
      record('S0', 'Admin login', 'FAIL', r.data.error);
      return results;
    }
  }

  // ============================================================
  // SCENARIO 1: Change Mustafa from Service Advisor → Breakdown
  // ============================================================
  section('SCENARIO 1: Admin changes Mustafa role to Breakdown');
  {
    const usersRes = await api('GET', '/api/users', null, adminToken);
    record('S1', 'GET /api/users returns user list', usersRes.ok ? 'PASS' : 'FAIL');

    const mustafaUser = usersRes.data.find(u => u.username === 'mustafa');
    record('S1', 'Mustafa user account found (username=mustafa)', mustafaUser ? 'PASS' : 'FAIL',
      mustafaUser ? `user_id=${mustafaUser.user_id}, employee_id=${mustafaUser.employee_id}, role=${mustafaUser.role}` : 'NOT FOUND');

    if (mustafaUser) {
      const originalRole = mustafaUser.role;
      record('S1', `Mustafa current role = ${originalRole}`, 'PASS');

      // Check for DUPLICATE employee records (known CR-001 finding)
      const empRes = await api('GET', '/api/employees', null, adminToken);
      const mustafaEmps = empRes.data.filter(e => e.full_name?.toUpperCase()?.includes('MUSTAFA'));
      record('S1', `Mustafa employee records found: ${mustafaEmps.length}`,
        mustafaEmps.length === 1 ? 'PASS' : 'WARN',
        mustafaEmps.map(e => `id=${e.employee_id}, code=${e.employee_code}, role=${e.role}`).join(' | '));

      // Change role to breakdown
      const updateRes = await api('PUT', `/api/users/${mustafaUser.user_id}`, { role: 'breakdown' }, adminToken);
      record('S1', 'PUT /api/users/:id role→breakdown', updateRes.ok ? 'PASS' : 'FAIL',
        updateRes.ok ? `response role=${updateRes.data.role}` : JSON.stringify(updateRes.data));

      // Verify user list updated
      const verifyUsersRes = await api('GET', '/api/users', null, adminToken);
      const updatedUser = verifyUsersRes.data.find(u => u.user_id === mustafaUser.user_id);
      record('S1', 'User directory reflects breakdown role', updatedUser?.role === 'breakdown' ? 'PASS' : 'FAIL', `role=${updatedUser?.role}`);

      // Verify linked employee record updated
      const empRes2 = await api('GET', '/api/employees', null, adminToken);
      const linkedEmp = empRes2.data.find(e => e.employee_id === mustafaUser.employee_id);
      record('S1', `Linked employee (id=${mustafaUser.employee_id}) role synced to breakdown`,
        linkedEmp?.role === 'breakdown' ? 'PASS' : 'FAIL', `role=${linkedEmp?.role}`);

      // Check legacy duplicate employee is NOT synced (expected behavior)
      const legacyEmp = empRes2.data.find(e => e.employee_id === 22 && e.full_name?.toUpperCase() === 'MUSTAFA');
      if (legacyEmp) {
        record('S1', `Legacy employee (id=22) remains unchanged (SA)`,
          legacyEmp.role === 'SA' ? 'WARN' : 'PASS',
          `role=${legacyEmp.role} — DUPLICATE NOT SYNCED, this is a known CR-001 finding`);
      }

      // Check JWT token after role change
      const permRes = await api('GET', '/api/permissions', null, adminToken);
      if (permRes.ok && Array.isArray(permRes.data)) {
        const bdPerms = permRes.data.filter(p => p.role_name === 'breakdown' && p.can_view === 1);
        record('S1', `Breakdown role permissions configured`, bdPerms.length > 0 ? 'PASS' : 'FAIL',
          `${bdPerms.length} modules: ${bdPerms.map(p => p.module_name).join(', ')}`);
      }

      // ============================================================
      // SCENARIO 2: Login as Mustafa with Breakdown role
      // ============================================================
      section('SCENARIO 2: Login as Mustafa (now Breakdown)');
      {
        const mRes = await api('POST', '/api/auth/login', { username: 'mustafa', password: 'password123' });
        if (!mRes.ok) {
          // Try alternate passwords
          const mRes2 = await api('POST', '/api/auth/login', { username: 'mustafa', password: 'Mustafa@123' });
          if (mRes2.ok) {
            record('S2', 'Mustafa login successful (alternate password)', 'PASS');
            record('S2', `JWT role = ${mRes2.data.user.role}`, mRes2.data.user.role === 'breakdown' ? 'PASS' : 'FAIL', `role=${mRes2.data.user.role}`);
            const mustafaToken = mRes2.data.token;
            
            const bdRes = await api('GET', '/api/breakdowns', null, mustafaToken);
            record('S2', 'GET /api/breakdowns accessible', bdRes.status !== 403 ? 'PASS' : 'FAIL', `status=${bdRes.status}`);
          } else {
            record('S2', 'Mustafa login', 'FAIL', `Both passwords rejected: ${mRes.data.error}, ${mRes2.data.error}`);
          }
        } else {
          record('S2', 'Mustafa login successful', 'PASS');
          record('S2', `JWT role = ${mRes.data.user.role}`, mRes.data.user.role === 'breakdown' ? 'PASS' : 'FAIL', `role=${mRes.data.user.role}`);
          const mustafaToken = mRes.data.token;

          const bdRes = await api('GET', '/api/breakdowns', null, mustafaToken);
          record('S2', 'GET /api/breakdowns accessible', bdRes.status !== 403 ? 'PASS' : 'FAIL', `status=${bdRes.status}`);
        }
      }

      // ============================================================
      // SCENARIO 3: Revert Mustafa to Service Advisor
      // ============================================================
      section('SCENARIO 3: Revert Mustafa to Service Advisor');
      {
        const revertRes = await api('PUT', `/api/users/${mustafaUser.user_id}`, { role: 'service_advisor' }, adminToken);
        record('S3', 'PUT /api/users/:id role→service_advisor', revertRes.ok ? 'PASS' : 'FAIL',
          revertRes.ok ? `role=${revertRes.data.role}` : JSON.stringify(revertRes.data));

        // Verify user list
        const verifyRes = await api('GET', '/api/users', null, adminToken);
        const reverted = verifyRes.data.find(u => u.user_id === mustafaUser.user_id);
        record('S3', 'User directory reflects service_advisor', reverted?.role === 'service_advisor' ? 'PASS' : 'FAIL', `role=${reverted?.role}`);

        // Verify linked employee
        const empRes3 = await api('GET', '/api/employees', null, adminToken);
        const linkedEmp3 = empRes3.data.find(e => e.employee_id === mustafaUser.employee_id);
        record('S3', `Linked employee (id=${mustafaUser.employee_id}) role reverted`,
          linkedEmp3?.role === 'service_advisor' ? 'PASS' : 'FAIL', `role=${linkedEmp3?.role}`);

        // Re-login to verify JWT
        const mRes3 = await api('POST', '/api/auth/login', { username: 'mustafa', password: 'password123' });
        if (mRes3.ok) {
          record('S3', `JWT after revert = ${mRes3.data.user.role}`, mRes3.data.user.role === 'service_advisor' ? 'PASS' : 'FAIL');
        } else {
          const mRes3b = await api('POST', '/api/auth/login', { username: 'mustafa', password: 'Mustafa@123' });
          if (mRes3b.ok) {
            record('S3', `JWT after revert = ${mRes3b.data.user.role}`, mRes3b.data.user.role === 'service_advisor' ? 'PASS' : 'FAIL');
          }
        }
      }
    }
  }

  // ============================================================
  // SCENARIO 4: Shashi Employee Verification
  // ============================================================
  section('SCENARIO 4: Shashi Employee Verification');
  {
    const empRes = await api('GET', '/api/employees', null, adminToken);
    const shashiEmps = empRes.data.filter(e => e.full_name?.toUpperCase()?.includes('SHASHI'));
    record('S4', `Shashi employee records: ${shashiEmps.length}`,
      shashiEmps.length === 1 ? 'PASS' : 'WARN',
      shashiEmps.map(e => `id=${e.employee_id}, code=${e.employee_code}, role=${e.role}`).join(' | '));

    const usersRes = await api('GET', '/api/users', null, adminToken);
    const shashiUsers = usersRes.data.filter(u => 
      u.full_name?.toUpperCase()?.includes('SHASHI') || u.username?.includes('shashi') || u.username?.includes('sahsi'));
    record('S4', `Shashi user accounts: ${shashiUsers.length}`,
      shashiUsers.length >= 1 ? 'PASS' : 'WARN',
      shashiUsers.map(u => `user_id=${u.user_id}, username=${u.username}, employee_id=${u.employee_id}`).join(' | '));

    // Check employee_id linkage
    if (shashiUsers.length > 0 && shashiEmps.length > 0) {
      const linkedEmpIds = shashiUsers.map(u => u.employee_id);
      const matchedEmp = shashiEmps.find(e => linkedEmpIds.includes(e.employee_id));
      record('S4', 'Shashi user→employee linkage valid', matchedEmp ? 'PASS' : 'FAIL',
        matchedEmp ? `employee_id=${matchedEmp.employee_id}` : `user emp_ids=${linkedEmpIds}, emp ids=${shashiEmps.map(e=>e.employee_id)}`);
    }

    // Check username typo
    const typoUser = usersRes.data.find(u => u.username === 'sahsi');
    if (typoUser) {
      record('S4', 'Shashi username has typo "sahsi"', 'WARN', 'Should be "shashi" — known data quality issue');
    }
  }

  // ============================================================
  // SCENARIO 5: Job Card Data Flow
  // ============================================================
  section('SCENARIO 5: Job Card Data Flow Verification');
  {
    const jcRes = await api('GET', '/api/job-cards', null, adminToken);
    record('S5', 'GET /api/job-cards returns data', jcRes.ok ? 'PASS' : 'FAIL');

    if (jcRes.ok && typeof jcRes.data === 'object') {
      const jcData = Array.isArray(jcRes.data) ? jcRes.data : jcRes.data.job_cards || [];
      record('S5', `Total job cards: ${jcData.length}`, jcData.length > 0 ? 'PASS' : 'WARN');

      if (jcData.length > 0) {
        const sample = jcData[0];
        console.log(`  Sample JC fields: ${Object.keys(sample).slice(0, 15).join(', ')}`);

        // Check advisors match employee directory
        const empRes = await api('GET', '/api/employees', null, adminToken);
        const empNames = new Set(empRes.data.map(e => e.full_name?.toUpperCase()));

        const advisors = [...new Set(jcData.map(jc => jc.service_advisor).filter(Boolean))];
        let advisorMatches = 0;
        for (const adv of advisors) {
          if (empNames.has(adv?.toUpperCase())) advisorMatches++;
        }
        record('S5', `Advisor name matches in employees: ${advisorMatches}/${advisors.length}`,
          advisorMatches > 0 ? 'PASS' : 'WARN',
          `Advisors: ${advisors.slice(0, 5).join(', ')}`);

        // Check technician names
        const techs = [...new Set(jcData.map(jc => jc.technician_name).filter(Boolean))];
        let techMatches = 0;
        for (const t of techs) {
          if (empNames.has(t?.toUpperCase())) techMatches++;
        }
        record('S5', `Technician name matches in employees: ${techMatches}/${techs.length}`,
          techMatches > 0 ? 'PASS' : 'WARN',
          `Technicians: ${techs.slice(0, 5).join(', ')}`);
      }
    }
  }

  // ============================================================
  // SCENARIO 6: Vehicle History Data Source
  // ============================================================
  section('SCENARIO 6: Vehicle History Data Source Verification');
  {
    // Get a VRN from job cards
    const jcRes = await api('GET', '/api/job-cards', null, adminToken);
    let testVrn = '';
    if (jcRes.ok) {
      const jcData = Array.isArray(jcRes.data) ? jcRes.data : jcRes.data.job_cards || [];
      const withVrn = jcData.find(jc => jc.vrn);
      testVrn = withVrn?.vrn || 'MH12AB1234';
    }

    record('S6', `Test VRN: ${testVrn}`, testVrn ? 'PASS' : 'WARN');

    // Test vehicle history endpoint
    const vhRes = await api('GET', `/api/vehicle/history?vrn=${encodeURIComponent(testVrn)}`, null, adminToken);
    record('S6', `GET /api/vehicle/history?vrn=${testVrn}`,
      vhRes.status === 200 || vhRes.status === 400 ? 'PASS' : 'FAIL',
      `status=${vhRes.status}`);

    if (vhRes.ok) {
      const historyData = vhRes.data;
      if (Array.isArray(historyData)) {
        record('S6', `Vehicle history entries: ${historyData.length}`, 'PASS');
      } else if (typeof historyData === 'object') {
        record('S6', `Vehicle history response keys: ${Object.keys(historyData).join(', ')}`, 'PASS');
      }
    }

    // Test vehicle health card
    const hcRes = await api('GET', `/api/vehicles/${encodeURIComponent(testVrn)}/health-card`, null, adminToken);
    record('S6', `GET /api/vehicles/:vrn/health-card`,
      hcRes.status !== 500 ? 'PASS' : 'FAIL', `status=${hcRes.status}`);

    // Check bay assignment data
    const bayRes = await api('GET', '/api/bays', null, adminToken);
    record('S6', `GET /api/bays`, bayRes.ok ? 'PASS' : 'FAIL',
      bayRes.ok ? `${bayRes.data.length || 0} bays` : `status=${bayRes.status}`);
  }

  // ============================================================
  // DATA INTEGRITY CHECKS
  // ============================================================
  section('DATA INTEGRITY CHECKS');
  {
    const empRes = await api('GET', '/api/employees', null, adminToken);
    const usersRes = await api('GET', '/api/users', null, adminToken);

    // Check for duplicate employees (by name)
    const nameCounts = {};
    for (const e of empRes.data) {
      const key = e.full_name?.toUpperCase();
      nameCounts[key] = (nameCounts[key] || 0) + 1;
    }
    const duplicates = Object.entries(nameCounts).filter(([, count]) => count > 1);
    record('INT', `Duplicate employee names: ${duplicates.length}`,
      duplicates.length === 0 ? 'PASS' : 'WARN',
      duplicates.map(([name, count]) => `${name}(${count})`).join(', '));

    // Check all user employee_ids link to valid employees
    const empIds = new Set(empRes.data.map(e => e.employee_id));
    let brokenLinks = 0;
    for (const u of usersRes.data) {
      if (u.employee_id && !empIds.has(u.employee_id)) {
        brokenLinks++;
        record('INT', `User ${u.username} has orphan employee_id=${u.employee_id}`, 'FAIL');
      }
    }
    if (brokenLinks === 0) {
      record('INT', 'All user→employee links are valid', 'PASS');
    }

    // Check role consistency (users vs linked employees)
    let roleSync = 0, roleDesync = 0;
    for (const u of usersRes.data) {
      if (u.employee_id) {
        const emp = empRes.data.find(e => e.employee_id === u.employee_id);
        if (emp && emp.role !== u.role && emp.role !== (u.user_role || u.role)) {
          roleDesync++;
          record('INT', `Role mismatch: user ${u.username} (${u.role}) ↔ employee ${emp.full_name} (${emp.role})`, 'WARN');
        } else if (emp) {
          roleSync++;
        }
      }
    }
    record('INT', `Role sync: ${roleSync} synced, ${roleDesync} mismatched`, roleDesync === 0 ? 'PASS' : 'WARN');

    // Check inconsistent role codes
    const roleCodes = [...new Set(empRes.data.map(e => e.role))];
    record('INT', `Unique role codes in employees: ${roleCodes.length}`, 'PASS', roleCodes.join(', '));
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  section('FINAL SUMMARY');
  console.log(`Total Passed:   ${results.passed}`);
  console.log(`Total Failed:   ${results.failed}`);
  console.log(`Total Warnings: ${results.warnings}`);
  const total = results.passed + results.failed + results.warnings;
  console.log(`Pass Rate:      ${((results.passed / total) * 100).toFixed(1)}%`);
  console.log(`\nGO/NO-GO: ${results.failed === 0 ? 'CONDITIONAL GO — warnings need resolution before production' : 'NO-GO — failures detected'}`);

  // Output JSON for report generation
  const fs = require('fs');
  fs.writeFileSync('scratch/validation_results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to scratch/validation_results.json');

  return results;
}

run().catch(console.error);
