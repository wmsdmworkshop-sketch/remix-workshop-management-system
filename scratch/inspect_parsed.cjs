const fs = require('fs');
const fastcsv = require('fast-csv');

const file = 'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv';
const content = fs.readFileSync(file, 'utf-8');
const cleanContent = content.startsWith('\ufeff') ? content.slice(1) : content;

const rows = [];
fastcsv.parseString(cleanContent, { headers: false })
    .on('data', (row) => rows.push(row))
    .on('end', () => {
        console.log("Header length:", rows[0].length);
        console.log("Headers:", rows[0]);
        console.log("\nRow 1 length:", rows[1].length);
        console.log("Row 1 content:", rows[1]);
    });
