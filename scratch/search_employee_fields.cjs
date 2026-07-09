const fs = require('fs');
const lines = fs.readFileSync('src/components/EmployeeDirectory.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('certification') || line.includes('Bronze') || line.includes('Gold') || line.includes('Remarks')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
