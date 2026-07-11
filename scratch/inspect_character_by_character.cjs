const fs = require('fs');

const file = 'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv';
let text = fs.readFileSync(file, 'utf-8');
if (text.startsWith('\ufeff')) {
    text = text.slice(1);
}
if (text.startsWith('"')) {
    text = text.slice(1);
}
if (text.endsWith('"')) {
    text = text.slice(0, -1);
}

text = text.replace(/"\r\n"/g, '\r\n');
text = text.replace(/"\n"/g, '\n');
text = text.replace(/""/g, '"');

const index = text.indexOf('BASAVARAJ');
if (index !== -1) {
    console.log("Found BASAVARAJ at index", index);
    console.log("Context:", JSON.stringify(text.substring(index - 100, index + 100)));
} else {
    console.log("BASAVARAJ not found");
}
