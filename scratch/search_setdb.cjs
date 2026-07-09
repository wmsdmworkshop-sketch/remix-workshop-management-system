const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');
let inside = false;
let count = 0;
lines.forEach((line, idx) => {
    if (line.includes('function getDB') || line.includes('function setDB') || line.includes('const getDB') || line.includes('const setDB')) {
        inside = true;
        count = 0;
    }
    if (inside) {
        console.log(`${idx + 1}: ${line.trim()}`);
        count++;
        if (count > 25) {
            inside = false;
        }
    }
});
