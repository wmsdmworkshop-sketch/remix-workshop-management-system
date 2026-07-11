const fs = require('fs');

function parseQuotedCsvLine(line) {
    line = line.replace(/\t+$/, '').trim();
    if (line.startsWith('"') && line.endsWith('"')) {
        line = line.slice(1, -1);
    }
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const next = line[i + 1];
        
        if (ch === '"' && next === '"') {
            if (!inQuotes) {
                inQuotes = true;
            } else {
                current += '"';
            }
            i++;
        } else if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current.trim());
    return fields;
}

function parseCurrency(val) {
    if (!val || val === '' || val === 'null') return 0;
    const cleaned = val.replace(/Rs\./gi, '').replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

const content = fs.readFileSync('C:/Users/arhaa/Downloads/data old/Invoice.csv', 'utf8');
const lines = content.split('\n').filter(Boolean);
const headers = parseQuotedCsvLine(lines[0]);
console.log('Headers:', headers);
const fields = parseQuotedCsvLine(lines[1]);
console.log('Fields parsed:', fields);
console.log('Fields count:', fields.length);
fields.forEach((f, idx) => {
  console.log(`Index ${idx}: "${f}" (raw) -> parsed as currency: ${parseCurrency(f)}`);
});
