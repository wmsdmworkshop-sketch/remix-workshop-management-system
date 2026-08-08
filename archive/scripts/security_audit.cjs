const fs = require('fs');

const code = fs.readFileSync('server.ts', 'utf8');

const routeRegex = /app\.(get|post|put|delete)\s*\(\s*(["'`]\/[^"'`]+["'`])\s*,/g;
let match;
let missingAuth = [];

while ((match = routeRegex.exec(code)) !== null) {
  const method = match[1];
  const path = match[2];
  // extract the rest of the line or function arguments to check for authenticateToken
  const index = match.index;
  const lineEnd = code.indexOf('{', index);
  const declaration = code.substring(index, lineEnd);
  
  if (!declaration.includes('authenticateToken') && !path.includes('/api/auth') && !path.includes('/api/customer')) {
    missingAuth.push(`${method.toUpperCase()} ${path}`);
  }
}

console.log("=== ROUTES MISSING AUTHENTICATION ===");
if (missingAuth.length === 0) {
  console.log("All non-auth/customer routes appear to have authenticateToken.");
} else {
  missingAuth.forEach(r => console.log(r));
}

// SQL Injection check
const queryRegex = /(dbPool\.query|dbPool\.execute)\s*\(\s*([^,]+)/g;
let missingParamBindings = [];
while ((match = queryRegex.exec(code)) !== null) {
  const sqlArg = match[2];
  if (sqlArg.includes('req.body') || sqlArg.includes('req.query') || sqlArg.includes('req.params') || sqlArg.includes('${')) {
    missingParamBindings.push(sqlArg);
  }
}

console.log("\n=== POTENTIAL SQL INJECTIONS ===");
if (missingParamBindings.length === 0) {
  console.log("No obvious SQL injections found.");
} else {
  missingParamBindings.forEach(r => console.log(r));
}
