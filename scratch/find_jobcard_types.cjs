const fs = require('fs');
const content = fs.readFileSync('src/types.ts', 'utf8');
const match = content.match(/export interface JobCard\s*\{([\s\S]*?)\}/);
if (match) {
    console.log(match[0]);
} else {
    console.log("JobCard interface not found in src/types.ts");
}
