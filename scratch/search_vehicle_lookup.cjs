const fs = require('fs');
const lines = fs.readFileSync('src/components/VehicleLookup.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('Bill') || line.includes('advisor') || line.includes('Technician') || line.includes('Advisor') || line.includes('Bay') || line.includes('BAY') || line.includes('price')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
