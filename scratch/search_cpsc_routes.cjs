const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('certification') || line.includes('workforce') || line.includes('upgrade')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
