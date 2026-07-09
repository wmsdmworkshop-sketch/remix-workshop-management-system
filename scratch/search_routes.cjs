const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.trim().startsWith('app.post(') || line.trim().startsWith('app.get(') || line.trim().startsWith('app.put(')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
