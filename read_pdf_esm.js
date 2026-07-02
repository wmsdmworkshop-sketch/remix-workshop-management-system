import fs from 'fs';
import pdf from 'pdf-parse';

const pdfPath = 'C:\\Users\\arhaa\\Downloads\\Dewanand Automobiles Service Business Review.pdf';
const outputPath = 'C:\\Users\\arhaa\\.gemini\\antigravity-ide\\scratch\\pdf_content.txt';

if (fs.existsSync(pdfPath)) {
  const dataBuffer = fs.readFileSync(pdfPath);
  pdf(dataBuffer).then(function(data) {
    fs.writeFileSync(outputPath, data.text, 'utf-8');
    console.log('PDF text successfully extracted to pdf_content.txt');
  }).catch(err => {
    console.error('Error parsing PDF:', err);
  });
} else {
  console.log('PDF file not found at ' + pdfPath);
}
