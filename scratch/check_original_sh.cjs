const fs = require('fs');

const origFile = 'C:/Users/arhaa/Downloads/data old/ServiceHistory.csv';
const cleanFile = 'C:/Users/arhaa/Downloads/data old/ServiceHistory_clean.csv';

const origContent = fs.readFileSync(origFile, 'utf-8');
const cleanContent = fs.readFileSync(cleanFile, 'utf-8');

function findRecord(content, id) {
    const lines = content.split(/\r?\n/);
    const index = lines.findIndex(l => l.includes(id));
    if (index !== -1) {
        return { index, line: lines[index] };
    }
    return null;
}

console.log("Original SH-Int-1-2QRMWIBJ:", findRecord(origContent, 'SH-Int-1-2QRMWIBJ'));
console.log("Cleaned SH-Int-1-2QRMWIBJ:", findRecord(cleanContent, 'SH-Int-1-2QRMWIBJ'));
