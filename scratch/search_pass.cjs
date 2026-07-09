const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('123456') || line.includes('password') || line.includes('seed') || line.includes('hash')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
