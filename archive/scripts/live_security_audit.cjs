const http = require('https');

const host = "wms-workshop-app-772298398554.asia-south1.run.app";

function testEndpoint(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                // NO AUTHORIZATION HEADER
            }
        };

        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, body: data.substring(0, 100) });
            });
        });

        req.on('error', error => {
            reject(error);
        });

        req.end();
    });
}

async function runAudit() {
    console.log("=== LIVE PRODUCTION SECURITY AUDIT ===");
    console.log("Testing endpoints WITHOUT a JWT token...\n");

    const endpoints = [
        "/api/job-cards",
        "/api/employees",
        "/api/roles"
    ];

    for (const ep of endpoints) {
        try {
            const result = await testEndpoint(ep);
            console.log(`GET ${ep} -> HTTP ${result.statusCode}`);
            if (result.statusCode === 200) {
                console.log(`[VULNERABILITY] Endpoint returned 200 OK without token! Preview: ${result.body}`);
            }
        } catch (e) {
            console.error(`Error testing ${ep}: ${e.message}`);
        }
    }
}

runAudit();
