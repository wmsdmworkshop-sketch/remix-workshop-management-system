const fs = require('fs');
const lines = fs.readFileSync('src/components/PartsWarrantyManager.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('validate') || line.includes('Validate') || line.includes('Odometer') || line.includes('Chassis') || line.includes('Sale Date')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
