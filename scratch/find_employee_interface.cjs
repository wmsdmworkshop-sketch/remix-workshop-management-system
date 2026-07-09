const fs = require('fs');
const content = fs.readFileSync('src/types.ts', 'utf8');
const match = content.match(/export interface Employee\s*\{([\s\S]*?)\}/);
if (match) {
    console.log(match[0]);
} else {
    console.log("Employee interface not found in src/types.ts");
}
