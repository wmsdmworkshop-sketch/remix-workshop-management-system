const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\arhaa\\.gemini\\antigravity-ide\\brain\\24301395-5fe6-4903-87c5-6dd72c37ba26\\.system_generated\\logs\\transcript.jsonl', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('deploy') || line.toLowerCase().includes('push') || line.toLowerCase().includes('git')) {
        console.log(`${idx + 1}: ${line.substring(0, 200)}...`);
    }
});
