const fs = require('fs');

try {
  const invRaw = fs.readFileSync('C:\\Users\\arhaa\\Downloads\\data old\\Invoice.csv', 'utf16le').replace(/^\uFEFF/, '');
  const invLines = invRaw.split('\n').filter(l => l.trim().length > 0);
  console.log('Lines parsed as utf16le:', invLines.length);
} catch (e) {
  console.error(e);
}
