const fs = require('fs');

const files = [
    'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv',
    'C:/Users/arhaa/Downloads/data old/ServiceHistory_clean.csv',
    'C:/Users/arhaa/Downloads/data old/Invoice_clean.csv'
];

for (const file of files) {
    console.log(`\n=== File: ${file} ===`);
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    console.log("Line 0 start/end:", JSON.stringify(lines[0].substring(0, 15)), "...", JSON.stringify(lines[0].substring(lines[0].length - 15)));
    console.log("Line 1 start/end:", JSON.stringify(lines[1].substring(0, 15)), "...", JSON.stringify(lines[1].substring(lines[1].length - 15)));
}
