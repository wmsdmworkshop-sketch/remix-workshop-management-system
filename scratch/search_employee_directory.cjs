const fs = require('fs');

const content = fs.readFileSync('src/components/EmployeeDirectory.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('<label') || line.includes('input') || line.includes('placeholder')) {
        if (line.includes('name') || line.includes('role') || line.includes('salary') || line.includes('mobile') || line.includes('email') || line.includes('code')) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    }
});
