const fs = require('fs');
const lines = fs.readFileSync('src/components/JobCardManager.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('Edit Job Card') || line.includes('showEditModal') || line.includes('isEditModal')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
