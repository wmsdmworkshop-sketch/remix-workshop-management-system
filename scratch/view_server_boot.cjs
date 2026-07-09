const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\arhaa\\.gemini\\antigravity-ide\\brain\\24301395-5fe6-4903-87c5-6dd72c37ba26\\.system_generated\\tasks\\task-1565.log', 'utf8');
const lines = content.split('\n');
lines.slice(0, 50).forEach((line, idx) => {
    console.log(`${idx + 1}: ${line.trim()}`);
});
