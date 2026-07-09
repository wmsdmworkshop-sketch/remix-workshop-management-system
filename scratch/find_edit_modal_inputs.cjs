const fs = require('fs');
const lines = fs.readFileSync('src/components/JobCardManager.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if ((line.includes('Allocated Bay') || line.includes('editBayNo') || line.includes('editTechnicianName')) && idx > 2500) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
