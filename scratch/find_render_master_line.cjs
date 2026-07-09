const fs = require('fs');
const lines = fs.readFileSync('src/components/DmsImporter.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('const renderMasterData = ()') || line.includes('const renderMasterData')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
