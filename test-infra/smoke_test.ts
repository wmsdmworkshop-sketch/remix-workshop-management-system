/**
 * DWIP Enterprise – Post-Deployment Smoke Test
 * 
 * Validates that a freshly deployed Cloud Run revision is healthy
 * before it should receive production traffic.
 * 
 * Usage: npx tsx scratch/smoke_test.ts [base_url] [uat_token]
 */

import https from 'https';

const BASE_URL = process.argv[2] || 'https://wms-workshop-app-473233046183.asia-south1.run.app';
const UAT_TOKEN = process.argv[3] || process.env.UAT_ACCESS_TOKEN || '';

let passed = 0;
let failed = 0;

function request(path: string, method: string = 'GET', body?: any, headers?: Record<string, string>): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const allHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };
    
    const options = { method, headers: allHeaders };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(testName: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.log(`  ✗ ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  DWIP Enterprise – Post-Deployment Smoke Test   ║`);
  console.log(`╚══════════════════════════════════════════════════╝`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Time:   ${new Date().toISOString()}\n`);

  // ─── Test 1: Health Endpoint ───
  console.log('[1] Health Endpoint');
  try {
    const { status, body } = await request('/api/health');
    assert('Returns 200', status === 200);
    assert('Status is healthy', body.status === 'healthy');
    assert('Database connected', body.database === 'connected');
    assert('Schema version > 0', body.schema_version > 0, `got: ${body.schema_version}`);
    assert('Boot time present', !!body.boot_time);
    console.log(`  → Schema v${body.schema_version}, uptime ${body.uptime_seconds}s`);
  } catch (err: any) {
    assert('Health endpoint reachable', false, err.message);
  }

  // ─── Test 2: Version Endpoint ───
  console.log('\n[2] Version Endpoint');
  try {
    const { status, body } = await request('/api/version');
    assert('Returns 200', status === 200);
    assert('App name is DWIP Enterprise', body.app === 'DWIP Enterprise');
    assert('Schema version present', body.schema_version > 0);
    assert('Migration history is array', Array.isArray(body.migration_history));
    assert('At least 1 migration applied', body.migrations_applied >= 1, `got: ${body.migrations_applied}`);
    console.log(`  → ${body.migrations_applied} migration(s), schema v${body.schema_version}`);
  } catch (err: any) {
    assert('Version endpoint reachable', false, err.message);
  }

  // ─── Test 3: UAT Security (no token → rejected) ───
  console.log('\n[3] UAT Endpoint Security');
  try {
    const { status } = await request('/api/uat/check-permission', 'POST', { user_id: 1, module_id: 1, action: 'view' });
    assert('UAT without token returns 401 or 403', status === 401 || status === 403, `got: ${status}`);
  } catch (err: any) {
    assert('UAT security check reachable', false, err.message);
  }

  // ─── Test 4: UAT with valid token ───
  if (UAT_TOKEN) {
    console.log('\n[4] UAT Endpoint with Token');
    try {
      const { status, body } = await request('/api/uat/check-permission', 'POST', 
        { user_id: 1, module_id: 1, action: 'view' },
        { 'X-UAT-Token': UAT_TOKEN }
      );
      assert('UAT with valid token returns 200', status === 200, `got: ${status}`);
      console.log(`  → Permission check response:`, JSON.stringify(body).slice(0, 100));
    } catch (err: any) {
      assert('UAT with token reachable', false, err.message);
    }

    // ─── Test 5: Role Template CRUD ───
    console.log('\n[5] Role Template CRUD (via UAT)');
    try {
      const { status, body } = await request('/api/uat/role-templates', 'POST', 
        { role_id: 3, module_id: 1, can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false },
        { 'X-UAT-Token': UAT_TOKEN }
      );
      assert('Role template creation returns 200', status === 200, `got: ${status}, body: ${JSON.stringify(body).slice(0, 100)}`);
    } catch (err: any) {
      assert('Role template creation', false, err.message);
    }

    // ─── Test 6: Audit Log ───
    console.log('\n[6] Audit Log Endpoint');
    try {
      const { status, body } = await request('/api/uat/audit-logs', 'GET', undefined,
        { 'X-UAT-Token': UAT_TOKEN }
      );
      assert('Audit logs returns 200', status === 200, `got: ${status}`);
      assert('Audit logs is array', Array.isArray(body));
    } catch (err: any) {
      assert('Audit log endpoint', false, err.message);
    }
  } else {
    console.log('\n[4-6] Skipped (no UAT_ACCESS_TOKEN provided)');
  }

  // ─── Test 7: Login endpoint exists ───
  console.log('\n[7] Login Endpoint Exists');
  try {
    const { status } = await request('/api/auth/login', 'POST', { username: '', password: '' });
    assert('Login endpoint reachable', status === 400 || status === 401, `got: ${status}`);
  } catch (err: any) {
    assert('Login endpoint reachable', false, err.message);
  }

  // ─── Results ───
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${'═'.repeat(50)}`);
  
  if (failed > 0) {
    console.log('\n❌ SMOKE TEST FAILED — DO NOT route production traffic to this revision.');
    process.exit(1);
  } else {
    console.log('\n✅ ALL SMOKE TESTS PASSED — Revision is safe for production traffic.');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal smoke test error:', err);
  process.exit(1);
});
