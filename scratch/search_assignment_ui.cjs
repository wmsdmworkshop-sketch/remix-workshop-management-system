const fs = require('fs');
const lines = fs.readFileSync('src/components/JobCardManager.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('service_advisor') || line.includes('technician') || line.includes('bay_id') || line.includes('assign')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
