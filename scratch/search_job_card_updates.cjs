const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('app.put("/api/job-cards') || line.includes('app.post("/api/job-cards')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
