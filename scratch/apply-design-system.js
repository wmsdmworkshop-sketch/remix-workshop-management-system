import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_DIRS = [
  path.resolve(__dirname, '../src/components'),
  path.resolve(__dirname, '../src/customer-portal')
];

// Replaces standard patterns with design system classes
function applyDesignSystem(content) {
  let modified = content;

  // 1. Refactor Buttons
  // Primary buttons
  modified = modified.replace(
    /className="([^"]*)\bbg-brand\b([^"]*)"/g,
    'className="ds-button-primary $1 $2"'
  );
  modified = modified.replace(
    /className="([^"]*)\bbg-orange-500\b([^"]*)"/g,
    'className="ds-button-primary $1 $2"'
  );
  // Secondary buttons
  modified = modified.replace(
    /className="([^"]*)\bbg-slate-800\b([^"]*)hover:bg-slate-700([^"]*)"/g,
    'className="ds-button-secondary $1 $2 $3"'
  );
  modified = modified.replace(
    /className="([^"]*)\bborder-slate-600\b([^"]*)text-slate-300([^"]*)"/g,
    'className="ds-button-secondary $1 $2 $3"'
  );
  // Danger buttons
  modified = modified.replace(
    /className="([^"]*)\bbg-rose-600\b([^"]*)"/g,
    'className="ds-button-danger $1 $2"'
  );
  modified = modified.replace(
    /className="([^"]*)\bbg-red-600\b([^"]*)"/g,
    'className="ds-button-danger $1 $2"'
  );
  // Success buttons
  modified = modified.replace(
    /className="([^"]*)\bbg-emerald-500\b([^"]*)"/g,
    'className="ds-button-success $1 $2"'
  );
  modified = modified.replace(
    /className="([^"]*)\bbg-emerald-600\b([^"]*)"/g,
    'className="ds-button-success $1 $2"'
  );

  // 2. Refactor Inputs and Selects
  modified = modified.replace(
    /<input([^>]*?)className="([^"]*?)(?:bg-slate-900|bg-slate-950|bg-slate-800|bg-slate-50)([^"]*?)"/g,
    '<input$1className="ds-input $2 $3"'
  );
  modified = modified.replace(
    /<select([^>]*?)className="([^"]*?)(?:bg-slate-900|bg-slate-950|bg-slate-800|bg-slate-50)([^"]*?)"/g,
    '<select$1className="ds-select $2 $3"'
  );
  modified = modified.replace(
    /<textarea([^>]*?)className="([^"]*?)(?:bg-slate-900|bg-slate-950|bg-slate-800|bg-slate-50)([^"]*?)"/g,
    '<textarea$1className="ds-textarea $2 $3"'
  );

  // 3. Refactor Labels
  modified = modified.replace(
    /<label([^>]*?)className="([^"]*?)text-slate-400([^"]*?)"/g,
    '<label$1className="ds-label $2 $3"'
  );

  // 4. Refactor Tables
  modified = modified.replace(
    /<table([^>]*?)className="([^"]*?)"/g,
    '<table$1className="ds-table $2"'
  );
  modified = modified.replace(
    /<th([^>]*?)className="([^"]*?)"/g,
    '<th$1className="ds-th $2"'
  );
  modified = modified.replace(
    /<td([^>]*?)className="([^"]*?)"/g,
    '<td$1className="ds-td $2"'
  );
  modified = modified.replace(
    /<tr([^>]*?)className="([^"]*?hover:[^"]*?)"/g,
    '<tr$1className="ds-table-row $2"'
  );

  // 5. Refactor Cards
  modified = modified.replace(
    /className="([^"]*?)\bbg-slate-900\/60\b([^"]*?)\bborder-slate-800\b([^"]*?)"/g,
    'className="ds-card $1 $2 $3"'
  );

  // 6. Clean up duplicate utility classes that might have been prepended
  modified = modified.replace(/class\b/g, 'class'); // simple sanity

  return modified;
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const updated = applyDesignSystem(content);
      if (updated !== content) {
        fs.writeFileSync(fullPath, updated, 'utf8');
        console.log(`Updated UI Consistency: ${fullPath}`);
      }
    }
  }
}

console.log("Starting design system application audit...");
TARGET_DIRS.forEach(processDirectory);
console.log("Design system application audit complete!");
