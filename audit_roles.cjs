const http = require('https');

const host = "wms-workshop-app-772298398554.asia-south1.run.app";

const usersToTest = [
    { username: "wmsdmworkshop@gmail.com", password: "developer", role: "developer" },
    { username: "workshop_admin", password: "admin123", role: "admin" },
    { username: "admin", password: "admin123", role: "admin" },
    { username: "abdulqadeer999@gmail.com", password: "password123", role: "billing" },
    { username: "patilshashi5558@gmail.com", password: "password123", role: "service_advisor" },
    { username: "Mdadhn98@gmail.com", password: "password123", role: "workshop_manager" },
    { username: "vitthal", password: "password123", role: "dealer_principal" }
];

function makeRequest(method, path, body = null, token = null) {
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

async function runAudit() {
    console.log("=== ROLE-BASED ACCESS CONTROL AUDIT V2 ===");
    for (const u of usersToTest) {
        console.log(`\nTesting Role: ${u.role} (${u.username})`);
        
        // Login
        const loginRes = await makeRequest('POST', '/api/auth/login', { username: u.username, password: u.password });
        if (loginRes.statusCode !== 200 || !loginRes.data.token) {
            console.log(`  [FAIL] Login failed! HTTP ${loginRes.statusCode}`);
            continue;
        }
        
        const token = loginRes.data.token;
        console.log(`  [PASS] Logged in successfully.`);

        // Test Endpoint 1: View Job Cards (General Access)
        const getJobsRes = await makeRequest('GET', '/api/job-cards', null, token);
        console.log(`  GET /api/job-cards -> HTTP ${getJobsRes.statusCode}`);
        
        // Test Endpoint 2: View Users (Admin Only)
        const getUsersRes = await makeRequest('GET', '/api/users', null, token);
        console.log(`  GET /api/users -> HTTP ${getUsersRes.statusCode}`);

    }
}

runAudit();
