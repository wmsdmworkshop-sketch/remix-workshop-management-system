const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('alert') || line.includes('notify') || line.includes('WS_EVENT') || line.includes('broadcast')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
