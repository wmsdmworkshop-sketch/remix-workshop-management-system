const fs = require('fs');
const { execSync } = require('child_process');

let envRenamed = false;
const envPath = '.env';
const bakPath = '.env.bak';

try {
  let envContent = '';
  // If .env exists, read its content and rename it out of the way
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    fs.renameSync(envPath, bakPath);
    envRenamed = true;
  }
  
  // Replace NODE_ENV and DB_DATABASE with test values
  let newEnv = [];
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('NODE_ENV=')) {
      continue;
    }
    if (line.startsWith('DB_DATABASE=')) {
      continue;
    }
    newEnv.push(line);
  }
  newEnv.push('NODE_ENV=test');
  newEnv.push('DB_DATABASE=wms_test');

  fs.writeFileSync(envPath, newEnv.join('\n'));
  process.env.NODE_ENV = 'test';

  // Run the command passed as arguments
  const args = process.argv.slice(2);
  if (args.length > 0) {
    execSync(args.join(' '), { stdio: 'inherit', env: process.env });
  } else {
    console.log("No command provided to run_isolated.cjs");
  }

} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Restore the original .env
  if (fs.existsSync(envPath)) {
    fs.unlinkSync(envPath);
  }
  if (envRenamed && fs.existsSync(bakPath)) {
    fs.renameSync(bakPath, envPath);
  }
}
