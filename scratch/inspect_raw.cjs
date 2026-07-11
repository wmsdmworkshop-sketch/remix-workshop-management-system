const fs = require('fs');
const file = 'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv';
const content = fs.readFileSync(file, 'utf-8');
console.log("Raw first 200 chars:", JSON.stringify(content.substring(0, 200)));
