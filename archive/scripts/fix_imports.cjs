const fs = require('fs');

const filesWithSpinner = [
  'src/components/ActiveBayTatMonitor.tsx',
  'src/components/AttendanceShiftLog.tsx',
  'src/components/AuthScreen.tsx',
  'src/components/CpscCertificationPanel.tsx',
  'src/components/DmsImporter.tsx',
  'src/components/GeminiAssistant.tsx',
  'src/components/GoogleIntegration.tsx',
  'src/components/ProductivityDashboard.tsx',
  'src/components/SelfServiceAttendance.tsx',
  'src/components/UserManagement.tsx'
];

filesWithSpinner.forEach(file => {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('import FunnySpinner')) {
    // Add import statement at the beginning
    c = `import FunnySpinner from "./FunnySpinner";\n` + c;
    fs.writeFileSync(file, c);
  }
});

const filesWithEscape = [
  'src/components/EmployeeDirectory.tsx',
  'src/components/GateEntryManager.tsx',
  'src/components/ProductivityDashboard.tsx'
];

filesWithEscape.forEach(file => {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('import { useEscapeKey }')) {
    c = `import { useEscapeKey } from "../hooks/useEscapeKey";\n` + c;
    fs.writeFileSync(file, c);
  }
});

console.log("Imports fixed");
