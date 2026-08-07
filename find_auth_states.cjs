const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

console.log("Searching for state declarations in src/App.tsx:");
lines.forEach((line, index) => {
  if (line.includes('useState') && (line.includes('user') || line.includes('token') || line.includes('needsAuth') || line.includes('Auth'))) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
