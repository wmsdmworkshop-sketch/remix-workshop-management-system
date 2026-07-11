const fs = require('fs');
const fastcsv = require('fast-csv');

const file = 'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split(/\r?\n/).filter(Boolean);

(async () => {
    for (let i = 0; i < lines.length; i++) {
        let l = lines[i].trim();
        if (l.startsWith('\ufeff')) {
            l = l.slice(1);
        }
        if (l.startsWith('"') && l.endsWith('"')) {
            l = l.slice(1, -1);
        }
        l = l.replace(/""/g, '"');

        try {
            await new Promise((resolve, reject) => {
                fastcsv.parseString(l, { headers: false })
                    .on('data', () => {})
                    .on('error', (err) => reject(err))
                    .on('end', () => resolve());
            });
        } catch (err) {
            console.error(`\nFailed at line ${i}:`);
            console.error("Line text:", JSON.stringify(lines[i]));
            console.error("Cleaned text:", JSON.stringify(l));
            console.error("Error:", err.message);
            break;
        }
    }
})();
