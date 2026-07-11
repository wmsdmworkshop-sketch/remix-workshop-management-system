const fs = require('fs');

const files = [
  'C:/Users/arhaa/Downloads/data old/Invoice.csv',
  'C:/Users/arhaa/Downloads/data old/Invoice_clean.csv',
  'C:/Users/arhaa/Downloads/data old/ServiceHistory.csv',
  'C:/Users/arhaa/Downloads/data old/ServiceHistory_clean.csv',
  'C:/Users/arhaa/Downloads/data old/VehicleMaster.csv',
  'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
    console.log(`${f}: ${lines.length} lines`);
  } else {
    console.log(`${f} does not exist`);
  }
});
