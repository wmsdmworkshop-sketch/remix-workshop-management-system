const http = require('https');

const host = "wms-workshop-app-772298398554.asia-south1.run.app";
let token = null;

function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: method,
            headers: headers
        };

        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed = data;
                try { parsed = JSON.parse(data); } catch (e) {}
                resolve({ statusCode: res.statusCode, data: parsed });
            });
        });
        
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runWorkflowAudit() {
    console.log("=== WORKFLOW & STATE MACHINE AUDIT ===");
    
    // Login as a user not rate-limited
    const loginRes = await makeRequest('POST', '/api/auth/login', { username: "suryakant", password: "password123" });
    if (loginRes.statusCode !== 200 || !loginRes.data.token) {
        console.log(`[FAIL] Login failed! HTTP ${loginRes.statusCode}`);
        return;
    }
    token = loginRes.data.token;
    console.log("[PASS] Logged in successfully.\n");

    // 1. Create a Job Card (Gate Entry)
    console.log("1. Creating Job Card (Gate Entry)...");
    const createRes = await makeRequest('POST', '/api/job-cards', {
        registrationNumber: "MH12XY" + Math.floor(Math.random() * 9999),
        customerName: "Audit Test",
        customerMobile: "8888888888",
        vehicleModel: "Tata Nexon",
        complaints: "Testing illegal state transitions",
        odometer: "5000",
        fuelLevel: "50%",
        status: "Waiting",
        estimatedCost: 0
    });
    
    if (createRes.statusCode !== 200 || !createRes.data.job_id) {
        console.log(`[FAIL] Could not create Job Card. HTTP ${createRes.statusCode}`);
        return;
    }
    
    const jobId = createRes.data.job_id;
    console.log(`[PASS] Job Card created with ID ${jobId}. Status: Waiting.\n`);

    // 2. Attempt Illegal Transition (Waiting -> Invoiced)
    console.log("2. Attempting illegal transition: Waiting -> Invoiced");
    const illegalRes = await makeRequest('POST', `/api/job-cards/${jobId}/bill`, { invoice_amount: 500 });
    
    if (illegalRes.statusCode === 200) {
        console.log(`[FAIL] VULNERABILITY! Backend allowed direct transition from Waiting to Invoiced!`);
    } else {
        console.log(`[PASS] Backend rejected illegal transition. HTTP ${illegalRes.statusCode}`);
        console.log(`       Message: ${JSON.stringify(illegalRes.data)}`);
    }
}

runWorkflowAudit();
