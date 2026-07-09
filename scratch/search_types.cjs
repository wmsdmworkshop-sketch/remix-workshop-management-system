const fs = require('fs');
const content = fs.readFileSync('src/types.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('Employee') || line.includes('interface ') || line.includes('type ')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
