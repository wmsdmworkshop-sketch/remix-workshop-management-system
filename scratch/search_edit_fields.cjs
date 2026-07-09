const fs = require('fs');
const lines = fs.readFileSync('src/components/JobCardManager.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('editServiceAdvisor') || line.includes('editTechnicianName') || line.includes('editBayNo')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
