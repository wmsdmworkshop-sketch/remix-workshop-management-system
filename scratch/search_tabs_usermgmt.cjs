const fs = require('fs');

const content = fs.readFileSync('src/components/UserManagement.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('border-b border-slate-200')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
