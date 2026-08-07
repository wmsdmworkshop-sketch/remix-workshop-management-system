const fs = require('fs');
const lines = fs.readFileSync('src/components/DmsImporter.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.includes('const renderBackdatedUploader') || line.includes('const renderMasterData') || line.includes('resetWizard')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
