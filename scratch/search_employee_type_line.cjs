const fs = require('fs');
const lines = fs.readFileSync('src/types.ts', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('export interface Employee')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
