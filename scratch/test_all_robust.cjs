const fs = require('fs');

const files = [
    'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv',
    'C:/Users/arhaa/Downloads/data old/ServiceHistory_clean.csv',
    'C:/Users/arhaa/Downloads/data old/Invoice_clean.csv'
];

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

for (const file of files) {
    console.log(`\n=== Testing File: ${file} ===`);
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    
    let mismatchCount = 0;
    const firstRowFields = parseCSVLineRobust(
        lines[0].trim().startsWith('\ufeff') 
            ? lines[0].trim().slice(1).slice(1, -1).replace(/""/g, '"') 
            : lines[0].trim().slice(1, -1).replace(/""/g, '"')
    );
    const expectedCols = firstRowFields.length;
    console.log(`Expected columns: ${expectedCols}`);

    for (let i = 0; i < lines.length; i++) {
        let l = lines[i].trim();
        if (l.startsWith('\ufeff')) {
            l = l.slice(1);
        }
        if (l.startsWith('"') && l.endsWith('"')) {
            l = l.slice(1, -1);
        }
        l = l.replace(/""/g, '"');
        
        const fields = parseCSVLineRobust(l);
        if (fields.length !== expectedCols) {
            mismatchCount++;
            if (mismatchCount <= 3) {
                console.log(`Mismatch at line ${i}: expected ${expectedCols}, got ${fields.length}`);
                console.log("Raw line:", JSON.stringify(lines[i]));
                console.log("Parsed fields:", fields);
            }
        }
    }
    console.log(`Total rows: ${lines.length}`);
    console.log(`Total mismatches: ${mismatchCount}`);
}
