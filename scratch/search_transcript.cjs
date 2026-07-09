const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:\\Users\\arhaa\\.gemini\\antigravity-ide\\brain\\24301395-5fe6-4903-87c5-6dd72c37ba26\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (line.toLowerCase().includes('gcloud') && (line.includes('deploy') || line.includes('builds') || line.includes('submit'))) {
      console.log(`Line ${lineCount}: ${line.slice(0, 300)}`);
    }
  }
}
run();
