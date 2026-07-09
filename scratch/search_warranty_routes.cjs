const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('/api/warranty') || line.includes('/api/fsb')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
