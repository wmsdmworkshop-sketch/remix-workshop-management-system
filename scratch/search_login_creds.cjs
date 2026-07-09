const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:\\Users\\arhaa\\.gemini\\antigravity-ide\\brain\\24301395-5fe6-4903-87c5-6dd72c37ba26\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('login') && (line.includes('username') || line.includes('password') || line.includes('otp'))) {
      console.log(line.slice(0, 500));
    }
  }
}
run();
