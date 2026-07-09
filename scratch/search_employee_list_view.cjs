const fs = require('fs');
const lines = fs.readFileSync('src/components/EmployeeDirectory.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('isEditing') || line.includes('handleSaveEdit') || line.includes('editName')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
