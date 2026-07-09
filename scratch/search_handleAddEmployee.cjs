const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('handleAddEmployee') || line.includes('handleUpdateEmployee')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
