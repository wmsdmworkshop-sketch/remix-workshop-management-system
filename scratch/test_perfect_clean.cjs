const fs = require('fs');
const fastcsv = require('fast-csv');

const files = [
    'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv',
    'C:/Users/arhaa/Downloads/data old/ServiceHistory_clean.csv',
    'C:/Users/arhaa/Downloads/data old/Invoice_clean.csv'
];

async function testFile(filePath) {
    console.log(`\n=== Testing File: ${filePath} ===`);
    let text = fs.readFileSync(filePath, 'utf-8');
    if (text.startsWith('\ufeff')) {
        text = text.slice(1);
    }
    if (text.startsWith('"')) {
        text = text.slice(1);
    }
    if (text.endsWith('"')) {
        text = text.slice(0, -1);
    }
    
    // Replace the line ends wrapped in quotes.
    text = text.replace(/"\r\n"/g, '\r\n');
    text = text.replace(/"\n"/g, '\n');
    
    // Replace doubled quotes with single quotes
    text = text.replace(/""/g, '"');
    
    const rows = [];
    await new Promise((resolve, reject) => {
        fastcsv.parseString(text, { headers: false })
            .on('data', (row) => rows.push(row))
            .on('error', (err) => reject(err))
            .on('end', () => resolve());
    });

    console.log("Header length:", rows[0].length);
    console.log("Headers:", rows[0]);
    console.log("Total rows parsed:", rows.length);
    
    let mismatchCount = 0;
    const expectedCols = rows[0].length;
    for (let i = 1; i < rows.length; i++) {
        if (rows[i].length !== expectedCols) {
            mismatchCount++;
            if (mismatchCount <= 3) {
                console.log(`Mismatch at row ${i}: expected ${expectedCols}, got ${rows[i].length}`);
                console.log("Row contents:", rows[i]);
            }
        }
    }
    console.log("Total mismatches:", mismatchCount);
}

(async () => {
    try {
        for (const file of files) {
            await testFile(file);
        }
    } catch (err) {
        console.error("Test failed:", err);
    }
})();
