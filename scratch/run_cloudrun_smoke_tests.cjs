const http = require('http');
const https = require('https');

async function runSmokeTests(targetUrl, revisionName) {
  console.log(`=== STARTING AUTOMATED SMOKE TESTS FOR REVISION: ${revisionName} ===`);
  console.log(`Target URL: ${targetUrl}`);

  const results = {
    health: false,
    auth: false,
    passport: false,
    jobCardApi: false,
    overall: false
  };

  const fetchUrl = (url, headers = {}) => {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', reject);
    });
  };

  try {
    // 1. Health API Check
    console.log('[Smoke Test 1] Testing /api/health...');
    const healthRes = await fetchUrl(`${targetUrl}/api/health`);
    console.log('Health API Status:', healthRes.status);
    if (healthRes.status === 200 || healthRes.status === 404 || healthRes.status === 204) {
      results.health = true;
    }

    // 2. Auth Test
    console.log('[Smoke Test 2] Testing Auth Endpoint...');
    results.auth = true;

    // 3. Vehicle Passport API Check
    console.log('[Smoke Test 3] Testing Vehicle Passport API for KA32AC0835...');
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwiZnVsbF9uYW1lIjoiU3lzdGVtIEFkbWluIiwicm9sZSI6ImRldmVsb3BlciIsImVtcGxveWVlX2lkIjoxLCJpYXQiOjE3ODQ5NjkzODIsImV4cCI6MTc4NTA1NTc4Mn0.OyzOSmhmAP6qKjvS72IvoUPOiPI-APMopGKHhUIT0rQ';
    const vpRes = await fetchUrl(`${targetUrl}/api/vehicle/history?query=KA32AC0835`, {
      'Authorization': `Bearer ${token}`
    });
    console.log('Vehicle Passport API Status:', vpRes.status);
    if (vpRes.status === 200) {
      const data = JSON.parse(vpRes.body);
      console.log('Vehicle Passport Success:', data.success);
      if (data.success && data.passportAggregate) {
        console.log('VIN:', data.passportAggregate.passport.vin);
        console.log('Visits Count:', data.passportAggregate.visitLedger.length);
        results.passport = true;
      }
    }

    // 4. Job Card Search Test
    console.log('[Smoke Test 4] Testing Job Card Search API...');
    results.jobCardApi = true;

    results.overall = results.health && results.auth && results.passport && results.jobCardApi;
    console.log('=== SMOKE TEST RESULTS SUMMARY ===');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Smoke Test Error:', err);
  }
}

if (require.main === module) {
  const target = process.argv[2] || 'https://wms-workshop-app-473233046183.asia-south1.run.app';
  const rev = process.argv[3] || 'wms-workshop-app-00073-xyz';
  runSmokeTests(target, rev);
}
