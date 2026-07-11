const fs = require('fs');
const fastcsv = require('fast-csv');

const file = 'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split(/\r?\n/).filter(Boolean);
const cleanedLines = lines.map(line => {
    let l = line.trim();
    if (l.startsWith('\ufeff')) {
        l = l.slice(1);
    }
    if (l.startsWith('"') && l.endsWith('"')) {
        l = l.slice(1, -1);
    }
    // Replace doubled quotes with single quotes
    l = l.replace(/""/g, '"');
    return l;
});

const cleanedContent = cleanedLines.join('\n');

const rows = [];
fastcsv.parseString(cleanedContent, { headers: false })
    .on('data', (row) => rows.push(row))
    .on('end', () => {
        console.log("Header length:", rows[0].length);
        console.log("Headers:", rows[0]);
        console.log("\nRow 1 length:", rows[1].length);
        console.log("Row 1 content:", rows[1]);
        console.log("Total rows parsed:", rows.length);
    });
