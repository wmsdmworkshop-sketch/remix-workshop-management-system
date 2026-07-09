const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('app.put("/api/employees/:id"') || line.includes('app.put(\'/api/employees/:id\'')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
