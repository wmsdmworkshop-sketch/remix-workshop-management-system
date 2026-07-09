const fs = require('fs');
const lines = fs.readFileSync('src/db/sync.ts', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('attendance')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
