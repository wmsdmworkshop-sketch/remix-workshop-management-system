const fs = require('fs');
const lines = fs.readFileSync('src/components/JobCardManager.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('bay_id') || line.includes('technician') || line.includes('advisor') || line.includes('Service Advisor')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
