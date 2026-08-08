const fs = require('fs');
const http = require('https');

async function fetchApi(url, method, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let result = '';
      res.on('data', chunk => result += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(result) });
        } catch(e) {
          resolve({ status: res.statusCode, data: result });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  const URL = 'https://wms-workshop-app-772298398554.asia-south1.run.app';
  console.log("1. Logging in...");
  const loginRes = await fetchApi(`${URL}/api/auth/login`, 'POST', {
    username: 'admin',
    password: 'Admin@DWIP2026'
  });
  console.log("Login HTTP Status:", loginRes.status);
  const token = loginRes.data.token;
  
  if (!token) {
    console.log("Failed to login", loginRes.data);
    return;
  }

  console.log("\n2. Simulating Gate Entry (POST /api/job-cards)");
  const newJob = {
    registrationNumber: "MH12TM" + Math.floor(1000 + Math.random() * 9000),
    customerName: "Evidence Test Customer",
    customerMobile: "9998887776",
    vehicleModel: "Evidence Model",
    complaints: "Testing Gate In to Gate Out",
    odometer: "12345",
    fuelLevel: "50%",
    status: "Waiting",
    estimatedCost: 1000
  };
  
  const createRes = await fetchApi(`${URL}/api/job-cards`, 'POST', newJob, token);
  console.log("POST /api/job-cards HTTP Status:", createRes.status);
  console.log("Response:", createRes.data);
  const jobId = createRes.data.job_id;

  if (!jobId) {
    console.log("Failed to create Job Card");
    return;
  }

  console.log(`\n3. Start Repair (PUT /api/job-cards/${jobId})`);
  const startRes = await fetchApi(`${URL}/api/job-cards/${jobId}`, 'PUT', { status: 'Active' }, token);
  console.log(`PUT /api/job-cards/${jobId} HTTP Status:`, startRes.status);
  console.log("Response:", startRes.data);

  console.log(`\n4. Complete Repair (PUT /api/job-cards/${jobId})`);
  const completeRes = await fetchApi(`${URL}/api/job-cards/${jobId}`, 'PUT', { status: 'Completed' }, token);
  console.log(`PUT /api/job-cards/${jobId} HTTP Status:`, completeRes.status);
  console.log("Response:", completeRes.data);

  console.log(`\n5. Gate Out (PUT /api/job-cards/${jobId})`);
  const gateOutRes = await fetchApi(`${URL}/api/job-cards/${jobId}`, 'PUT', { status: 'Invoiced' }, token);
  console.log(`PUT /api/job-cards/${jobId} HTTP Status:`, gateOutRes.status);
  console.log("Response:", gateOutRes.data);

  console.log("\n6. Fetching Database Evidence");
  const getRes = await fetchApi(`${URL}/api/job-cards/${jobId}`, 'GET', null, token);
  console.log(`GET /api/job-cards/${jobId} HTTP Status:`, getRes.status);
  console.log("Final Database State:", getRes.data);
}

run();
