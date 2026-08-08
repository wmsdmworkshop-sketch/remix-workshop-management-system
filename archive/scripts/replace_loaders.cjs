const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (!file.endsWith('.tsx')) return;
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  let modified = false;

  const loaderRegex = /<(?:Loader|Loader2|RefreshCw)[^>]*animate-spin[^>]*\/>/g;
  
  if (loaderRegex.test(content)) {
    content = content.replace(loaderRegex, (match) => {
      const classMatch = match.match(/className=["']([^"']+)["']/);
      const cn = classMatch ? classMatch[1].replace('animate-spin', '').replace('animate-spin-slow', '').trim() : 'h-4 w-4';
      return `<FunnySpinner className="${cn}" />`;
    });
    modified = true;
  }

  if (modified) {
    if (!content.includes('FunnySpinner')) {
      content = content.replace(/import React(.*?)from\s+['"]react['"];/, "import React$1from 'react';\nimport FunnySpinner from './FunnySpinner';");
    }
    fs.writeFileSync(p, content);
    console.log('Updated ' + file);
  }
});
