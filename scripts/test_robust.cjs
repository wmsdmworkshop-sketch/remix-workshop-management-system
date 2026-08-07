const fs = require('fs');

const file = 'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split(/\r?\n/).filter(Boolean);

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

const parsedRows = [];
let mismatchCount = 0;

for (let i = 0; i < lines.length; i++) {
    let l = lines[i].trim();
    if (l.startsWith('\ufeff')) {
        l = l.slice(1);
    }
    if (l.startsWith('"') && l.endsWith('"')) {
        l = l.slice(1, -1);
    }
    // Note: Do NOT replace /""/g with /"/g here, because parseCSVLineRobust handles "" automatically!
    
    const fields = parseCSVLineRobust(l);
    parsedRows.push(fields);
    
    if (i > 0 && fields.length !== parsedRows[0].length) {
        mismatchCount++;
        if (mismatchCount <= 5) {
            console.log(`Mismatch at line ${i}: expected ${parsedRows[0].length} columns, got ${fields.length}`);
            console.log("Raw line:", JSON.stringify(lines[i]));
            console.log("Parsed fields:", fields);
        }
    }
}

console.log(`\nTotal rows: ${parsedRows.length}`);
console.log(`Total mismatches: ${mismatchCount}`);
