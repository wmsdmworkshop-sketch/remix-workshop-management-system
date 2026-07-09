const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('otp') || line.includes('mobile_no') || line.includes('email') || line.includes('mobile')) {
        if (line.includes('SELECT') || line.includes('UPDATE') || line.includes('query(')) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    }
});
