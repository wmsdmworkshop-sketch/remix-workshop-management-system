const fs = require('fs');
const lines = fs.readFileSync('src/components/PartsWarrantyManager.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('const [val') || line.includes('const [wClaim')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
