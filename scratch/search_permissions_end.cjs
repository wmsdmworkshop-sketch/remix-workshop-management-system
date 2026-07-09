const fs = require('fs');

const content = fs.readFileSync('src/components/UserManagement.tsx', 'utf8');
const lines = content.split('\n');
lines.slice(1000, 1055).forEach((line, idx) => {
    console.log(`${idx + 1001}: ${line.trim()}`);
});
