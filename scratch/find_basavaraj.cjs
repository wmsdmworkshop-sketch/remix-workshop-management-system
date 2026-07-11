const fs = require('fs');
const file = 'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split(/\r?\n/).filter(Boolean);
const matches = lines.filter(l => l.includes('BASAVARAJ'));
console.log(`Found ${matches.length} matches:`);
matches.slice(0, 5).forEach((m, idx) => {
    console.log(`\nMatch ${idx}:`);
    console.log("Raw:", JSON.stringify(m));
});
