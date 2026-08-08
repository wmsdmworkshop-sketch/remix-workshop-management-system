const fs = require('fs');

const statusOutput = fs.readFileSync('../git_status_raw.txt', 'utf8');
const lines = statusOutput.split('\n').filter(l => l.trim().length > 0);

const inventory = [];
const phase11Dirs = ['src/workflows/insurance/', 'src/workflows/goodwill/', 'src/workflows/warranty/', 'src/workshop/resource-planning/'];

const summary = {
  total: 0,
  staged: 0,
  unstaged: 0,
  untracked: 0,
  phase11: 0,
  byCategory: {},
  toExclude: {} // by dir
};

lines.forEach(line => {
  const statusStr = line.substring(0, 2);
  const file = line.substring(3).trim();
  
  if (!file) return;

  let category = 'APPLICATION SOURCE';
  let reason = 'Modified';
  let isPhase11 = phase11Dirs.some(dir => file.includes(dir));
  let isTest = file.includes('test') || file.includes('__tests__') || file.includes('vitest') || file.includes('playwright');
  let isBuild = file.includes('vite.config') || file.includes('package.json') || file.includes('.dockerignore') || file.includes('.gcloudignore');
  let isDoc = file.includes('.md');
  let isTemp = file.includes('temp') || file.includes('scratch') || file.includes('DWIP_');
  let isGen = file.includes('dist/') || file.includes('build/');

  if (isPhase11) category = 'PHASE 11 (Future Scope)';
  else if (isTemp) category = 'DEBUG/TEMP FILE';
  else if (isDoc) category = 'DOCUMENTATION';
  else if (isBuild) category = 'BUILD CONFIG';
  else if (isTest) category = 'TEST SOURCE';
  else if (isGen) category = 'GENERATED FILE';

  if (statusStr.includes('A') || statusStr.includes('?')) reason = 'New file added';
  if (statusStr.includes('M')) reason = 'Modified file';
  if (statusStr.includes('D')) reason = 'Deleted file';

  const belongsInRc1 = !isPhase11 && !isTemp ? 'YES' : 'NO';
  let action = belongsInRc1 === 'YES' ? 'COMMIT' : 'EXCLUDE';
  if (category === 'DEBUG/TEMP FILE') action = 'EXCLUDE';

  summary.total++;
  summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
  
  // Actually git status strings are e.g. " M", "M ", "??", "A "
  const x = statusStr[0];
  const y = statusStr[1];
  
  if (x !== ' ' && x !== '?') summary.staged++;
  if (y !== ' ' && y !== '?') summary.unstaged++;
  if (x === '?' && y === '?') summary.untracked++;

  if (isPhase11) {
    summary.phase11++;
    const dir = file.split('/').slice(0, 3).join('/'); // basic grouping
    summary.toExclude[dir] = (summary.toExclude[dir] || 0) + 1;
  }
});

fs.writeFileSync('rc1_inventory_summary.json', JSON.stringify(summary, null, 2));
console.log('Done parsing.');
