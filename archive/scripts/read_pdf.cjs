const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const pdfPath = 'C:\\Users\\arhaa\\Downloads\\Devanand Motors Automobile  MOTORS_11-06-2026.pdf';
const outputPath = 'C:\\Users\\arhaa\\.gemini\\antigravity-ide\\scratch\\pdf_content_2.txt';

if (fs.existsSync(pdfPath)) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  
  parser.getText().then(function(result) {
    fs.writeFileSync(outputPath, result.text, 'utf-8');
    console.log('PDF text successfully extracted to pdf_content_2.txt');
  }).catch(err => {
    console.error('Error parsing PDF:', err);
  });
} else {
  console.log('PDF file not found at ' + pdfPath);
}
