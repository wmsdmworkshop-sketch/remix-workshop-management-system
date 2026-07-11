const fs = require('fs');

function parseCSVLineRobust(line) {
    const fields = [];
    let current = "";
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (line[i + 1] === '"') {
                current += '"';
                i++; // skip next quote
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            fields.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    fields.push(current);
    return fields.map(v => {
        const trimmed = v.trim();
        return trimmed === "" ? null : trimmed;
    });
}

const content = fs.readFileSync('C:/Users/arhaa/Downloads/data old/Invoice_clean.csv', 'utf-8');
const lines = content.split(/\r?\n/).filter(Boolean);
const line = lines[1].trim();

// Simulate cleaning from db_importer.cjs
let l = line;
if (l.startsWith('\ufeff')) {
    l = l.slice(1);
}
if (l.startsWith('"') && l.endsWith('"')) {
    l = l.slice(1, -1);
}
l = l.replace(/""/g, '"');

const cells = parseCSVLineRobust(l);
console.log('Cells count:', cells.length);
console.log('Cells:', cells);

// Test cleaning index 7, 8, 9
for (let c = 7; c <= 9; c++) {
    let val = cells[c];
    if (val) {
        val = val.replace(/[^0-9.]/g, '');
        val = parseFloat(val) || 0.0;
    } else {
        val = 0.0;
    }
    console.log(`Index ${c} cleaned:`, val);
}
