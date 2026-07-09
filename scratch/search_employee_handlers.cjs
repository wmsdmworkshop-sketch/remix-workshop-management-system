const fs = require('fs');
const lines = fs.readFileSync('src/components/EmployeeDirectory.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('fetch(') || line.includes('POST') || line.includes('handleAddEmployee') || line.includes('startEdit') || line.includes('editingId')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
