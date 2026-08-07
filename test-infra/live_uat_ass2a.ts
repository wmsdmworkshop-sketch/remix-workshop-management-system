import https from 'https';

const BASE_URL = 'https://wms-workshop-app-473233046183.asia-south1.run.app';

const UAT_TOKEN = process.env.UAT_ACCESS_TOKEN || 'dwip-uat-secret-2026';

function request(path: string, method: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-UAT-Token': UAT_TOKEN
      }
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(JSON.parse(data));
          }
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runUAT() {
  console.log('--- STARTING LIVE PRODUCTION UAT (ASS-2A) ---');
  
  try {
    // 1. Role Template Lifecycle
    console.log('\n[1] Testing Role Template lifecycle...');
    const roleResponse = await request('/api/uat/role-templates', 'POST', {
      role_id: 3, // Developer
      module_id: 1, // Assume Workshop
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: false,
      can_approve: false
    });
    console.log('Role Template Set:', roleResponse);

    // 2. User Overrides
    console.log('\n[2] Testing User Overrides...');
    const overrideResponse = await request('/api/uat/user-overrides', 'POST', {
      user_id: 1,
      module_id: 1,
      permission_type: 'can_edit',
      is_allowed: false // Explicitly revoke edit
    });
    console.log('User Override Set (Revoke):', overrideResponse);

    // 3. Delegation Lifecycle
    console.log('\n[4] Testing Delegation Lifecycle...');
    const delegationResponse = await request('/api/uat/delegations', 'POST', {
      delegator_id: 1,
      delegatee_id: 2,
      module_id: 1, // Assume Inventory
      effective_until: new Date(Date.now() + 86400000).toISOString() // Valid for 1 day
    });
    console.log('Delegation Set:', delegationResponse);

    // 4. Live Cache Invalidation
    console.log('\n[4] Testing Live Cache Invalidation...');
    const cacheResponse = await request('/api/uat/invalidate-cache', 'POST');
    console.log('Cache Invalidated:', cacheResponse);

    // 5. Auth Checks (Verification)
    console.log('\n[5] Testing Auth Check Performance & Correctness...');
    
    // Check 1: Should be true (Service Advisor role grant)
    const check1 = await request('/api/uat/check-permission', 'POST', {
      user_id: 101, role_id: 2, role_name: "Service Advisor", module_name: "Workshop", action: "create"
    });
    console.log('Auth Check 1 (DB hit):', check1);

    // Check 2: Should be true AND faster (Cached)
    const check2 = await request('/api/uat/check-permission', 'POST', {
      user_id: 101, role_id: 2, role_name: "Service Advisor", module_name: "Workshop", action: "create"
    });
    console.log('Auth Check 2 (Cache hit):', check2);

    // 6. End-to-end Audit Logging
    console.log('\n[6] Testing End-to-end Audit Logging...');
    const auditLogs = await request('/api/uat/audit-logs', 'GET');
    console.log('Audit Logs Snippet:', JSON.stringify(auditLogs, null, 2).substring(0, 500));

    console.log('\n--- LIVE PRODUCTION UAT COMPLETE ---');
  } catch (error) {
    console.error('UAT Failed:', error);
  }
}

runUAT();
