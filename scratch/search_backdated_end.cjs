const fs = require('fs');
const content = fs.readFileSync('src/components/DmsImporter.tsx', 'utf8');
const searchStr = 'const renderBackdatedUploader = () =>';
const startIdx = content.indexOf(searchStr);
if (startIdx !== -1) {
    const sub = content.substring(startIdx);
    // Find matching bracket or next function definition
    const nextFuncIdx = sub.indexOf('const renderMasterData = ()');
    if (nextFuncIdx !== -1) {
        console.log(`Length of renderBackdatedUploader: ${nextFuncIdx}`);
        console.log(`End snippet: ${sub.substring(nextFuncIdx - 100, nextFuncIdx + 100)}`);
    } else {
        console.log('Could not find next function renderMasterData');
    }
} else {
    console.log('Could not find renderBackdatedUploader start');
}
