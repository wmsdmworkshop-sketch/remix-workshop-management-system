const fs = require('fs');
const lines = fs.readFileSync('src/components/EmployeeDirectory.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('basic_salary') || line.toLowerCase().includes('mobile') || line.toLowerCase().includes('full_name')) {
        if (idx < 200 || idx > 1100) { // limit output
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    }
});
