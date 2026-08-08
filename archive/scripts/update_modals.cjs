const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (file.endsWith('.tsx')) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    
    let modified = false;

    // A mapping of typical boolean states to their set functions
    const regex = /const\s+\[(showAdminLogin|showPurgeConfirm),\s+(set\w+)\]\s*=\s*useState\(false\);/g;
    
    content = content.replace(regex, (match, stateVar, setFunc) => {
      // Don't add if already exists
      if (content.includes(`(() => ${setFunc}(false), ${stateVar})`)) return match;
      modified = true;
      return `${match}\n  useEscapeKey(() => ${setFunc}(false), ${stateVar});`;
    });

    if (modified) {
      if (!content.includes('useEscapeKey')) {
        content = content.replace(/import React(.*?)from\s+['"]react['"];/, "import React$1from 'react';\nimport { useEscapeKey } from '../hooks/useEscapeKey';");
      }
      fs.writeFileSync(p, content);
      console.log('Updated ' + file);
    }
  }
});
