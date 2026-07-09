const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8');
const match = lines.match(/interface JobCard\s*\{([\s\S]*?)\}/);
if (match) {
    console.log(match[0]);
} else {
    console.log("JobCard interface not found in server.ts");
}
