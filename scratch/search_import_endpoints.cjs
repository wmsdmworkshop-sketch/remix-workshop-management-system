const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('/api/import/vehicle-master') || line.includes('/api/import/service-history') || line.includes('/api/import/invoices') || line.includes('/api/import/ai-match')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
