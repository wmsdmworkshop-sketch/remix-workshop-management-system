const fs = require('fs');
const file = 'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split(/\r?\n/);
console.log("Line 0 raw length:", lines[0].length);
console.log("Line 0 start/end:", JSON.stringify(lines[0].substring(0, 10)), "...", JSON.stringify(lines[0].substring(lines[0].length - 10)));
console.log("Line 1 raw length:", lines[1].length);
console.log("Line 1 start/end:", JSON.stringify(lines[1].substring(0, 10)), "...", JSON.stringify(lines[1].substring(lines[1].length - 10)));
