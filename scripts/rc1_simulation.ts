import fs from 'fs';

const BASE = 'http://localhost:3001';

async function api(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  
  const start = Date.now();
  let status = 500, ok = false, data: any = null, errorStr = '';
  
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    status = res.status;
    ok = res.ok;
    const text = await res.text();
    try { data = JSON.parse(text); } catch { data = text; }
  } catch (e: any) {
    errorStr = e.message;
  }
  
  const elapsed = Date.now() - start;
  return { status, ok, data, elapsed, error: errorStr };
}

const SCENARIOS = [
  'Retail Customer',
  'Warranty',
  'AMC',
  'Free Service',
  'Goodwill',
  'FSB Campaign',
  'Breakdown',
  'Repeat Repair',
  'Walk-in Emergency'
];

const STEPS = [
  { id: 'S01', name: 'Gate Entry', path: '/api/job-cards', method: 'POST' }, // Initial creation acts as Gate Entry
  { id: 'S02', name: 'Token', path: '/api/job-cards', method: 'POST' },
  { id: 'S03', name: 'Service Advisor', path: '/api/job-cards/{id}/assign', method: 'POST' },
  { id: 'S04', name: 'Job Card', path: '/api/job-cards', method: 'POST' },
  { id: 'S05', name: 'Inspection', path: '/api/job-cards/{id}/inspection', method: 'POST' }, // Missing
  { id: 'S06', name: 'Estimate', path: '/api/job-cards/{id}', method: 'PUT' }, // Updated via PUT
  { id: 'S07', name: 'Approval', path: '/api/job-cards/{id}/estimate-approval', method: 'POST' },
  { id: 'S08', name: 'Bay Allocation', path: '/api/job-cards/{id}', method: 'PUT' },
  { id: 'S09', name: 'Technician Assignment', path: '/api/job-cards/{id}/assign', method: 'POST' },
  { id: 'S10', name: 'Parts Reservation', path: '/api/parts/reserve', method: 'POST' }, // Missing
  { id: 'S11', name: 'Parts Issue', path: '/api/parts/issue', method: 'POST' }, // Missing
  { id: 'S12', name: 'Labour Entry', path: '/api/job-cards/{id}', method: 'PUT' }, // Updated via PUT
  { id: 'S13', name: 'QC', path: '/api/job-cards/{id}/qc-check', method: 'POST' },
  { id: 'S14', name: 'Road Test', path: '/api/job-cards/{id}/road-test', method: 'POST' }, // Missing
  { id: 'S15', name: 'Wash', path: '/api/job-cards/{id}/wash', method: 'POST' }, // Missing
  { id: 'S16', name: 'Billing', path: '/api/job-cards/{id}/bill', method: 'POST' },
  { id: 'S17', name: 'Cashier', path: '/api/job-cards/{id}/pre-invoice', method: 'POST' },
  { id: 'S18', name: 'Gate Pass', path: '/api/gate-pass', method: 'POST' }, // Missing
  { id: 'S19', name: 'Vehicle Exit', path: '/api/job-cards/{id}/manager-approve', method: 'POST' },
  { id: 'S20', name: 'Customer Feedback', path: '/api/feedback', method: 'POST' }, // Missing
  { id: 'S21', name: 'Dashboard Update', path: '/api/job-cards/{id}/tat', method: 'GET' },
  { id: 'S22', name: 'Audit Trail', path: '/api/job-cards/{id}/events', method: 'GET' },
  { id: 'S23', name: 'Day Close', path: '/api/day-close', method: 'POST' } // Missing
];

async function runSimulation() {
  const results: any[] = [];
  let token = '';

  // Attempt login
  const login = await api('POST', '/api/auth/login', { username: 'admin', password: 'Admin@DWIP2026' });
  if (login.ok) {
    token = login.data.token;
  }

  let totalScore = 0;
  let possibleScore = SCENARIOS.length * STEPS.length;

  for (const scenario of SCENARIOS) {
    console.log(`\n===========================================`);
    console.log(`Starting Scenario: ${scenario}`);
    console.log(`===========================================`);

    let jcId = '1001'; // Mock ID

    for (const step of STEPS) {
      let url = step.path.replace('{id}', jcId);
      
      const payload = step.method !== 'GET' ? { scenario, stage: step.name, timestamp: new Date() } : undefined;
      const res = await api(step.method, url, payload, token);
      
      let statusStr = 'FAIL';
      let errorType = '';
      
      if (res.ok) {
        statusStr = 'PASS';
        totalScore++;
      } else if (res.status === 404) {
        statusStr = 'FAIL';
        errorType = 'Missing Feature';
      } else if (res.status >= 500) {
        statusStr = 'FAIL';
        errorType = 'Server Error';
      } else {
        statusStr = 'FAIL';
        errorType = `Business Rule Violation (${res.status})`;
      }

      console.log(`[${statusStr}] ${step.name.padEnd(25)} | ${res.elapsed}ms | ${res.status === 404 ? '404 Not Found' : res.status}`);

      results.push({
        scenario,
        step: step.name,
        method: step.method,
        path: url,
        status: statusStr,
        httpCode: res.status,
        elapsedMs: res.elapsed,
        errorCategory: errorType
      });
    }
  }

  const scorePercent = ((totalScore / possibleScore) * 100).toFixed(2);
  console.log(`\n=== OVERALL BUSINESS READINESS SCORE: ${scorePercent}% ===\n`);

  fs.writeFileSync('scratch/rc1_simulation_results.json', JSON.stringify({
    score: scorePercent,
    results
  }, null, 2));
}

runSimulation().catch(console.error);
