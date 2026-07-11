const fs = require('fs');
const file = 'C:/Users/arhaa/Downloads/data old/ServiceHistory_clean.csv';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split(/\r?\n/).filter(Boolean);
console.log("Line 1927:", JSON.stringify(lines[1927]));
console.log("Line 1928:", JSON.stringify(lines[1928]));
