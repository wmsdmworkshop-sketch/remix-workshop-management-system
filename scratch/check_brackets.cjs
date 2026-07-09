const fs = require('fs');
const content = fs.readFileSync('src/components/DmsImporter.tsx', 'utf8');

let braces = 0;
let parens = 0;
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '{') braces++;
        else if (char === '}') braces--;
        else if (char === '(') parens++;
        else if (char === ')') parens--;
    }
    if (braces < 0) {
        console.log(`Line ${i + 1} has extra closing brace: ${line}`);
        break;
    }
}
console.log(`Final counts: braces=${braces}, parens=${parens}`);
