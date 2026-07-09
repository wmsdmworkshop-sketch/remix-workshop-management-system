const fs = require('fs');

const content = fs.readFileSync('src/components/UserManagement.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('activeTab') || line.includes('tab ===') || line.includes('<h1') || line.includes('<h2') || line.includes('useState')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
