const fs = require('fs');

const content = fs.readFileSync('src/db/sync.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('employee')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
