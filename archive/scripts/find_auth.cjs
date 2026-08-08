const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.ts');
const content = fs.readFileSync(serverPath, 'utf8');
const lines = content.split('\n');

console.log("Searching for auth endpoints in server.ts:");
lines.forEach((line, index) => {
  if (line.includes('/api/auth/') || line.includes('jwt') || line.includes('compare(')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
