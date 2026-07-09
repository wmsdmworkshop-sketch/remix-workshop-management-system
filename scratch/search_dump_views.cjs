const fs = require('fs');

const content = fs.readFileSync('railway_dump.sql', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if ((line.toLowerCase().includes('service_history') && !line.includes('fact_service_history') && !line.includes('dealership_service_history')) ||
        (line.toLowerCase().includes('invoices') && !line.includes('fact_invoices'))) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
