import * as XLSX from 'xlsx';
import * as path from 'path';

// Define checklists for each sheet
const sheetsData: { [key: string]: any[] } = {
  'Gate Security': [
    ['Morning Checklist'],
    ['Task', 'Verification Point', 'Status (Y/N)'],
    ['1. Verify device internet connection', 'Ping server/health success', ''],
    ['2. Check barcode printer power', 'Self-test page prints correctly', ''],
    ['3. Login with credentials', 'Direct access to Gate Entry screen', ''],
    [''],
    ['Transaction Checklist'],
    ['Task', 'Required Fields / Actions', 'Expected Outcome'],
    ['1. Vehicle Arrival', 'Input Registration plate number', 'Auto-fills historical matches'],
    ['2. Gate Entry Creation', 'Trigger "Create Gate Pass"', 'Prints barcode slip for driver'],
    ['3. Audit Trail Check', 'Verify status matches "ARRIVED"', 'Matches live monitor console'],
    [''],
    ['End of Day Checklist'],
    ['Task', 'Verification Point', 'Status (Y/N)'],
    ['1. Reconcile total gate passes', 'Physical count matches system report', ''],
    ['2. Scan scanner device for damage', 'Store securely in tool lockbox', ''],
  ],
  'Service Advisor': [
    ['Morning Checklist'],
    ['Task', 'Verification Point', 'Status (Y/N)'],
    ['1. Device check & Login', 'Login successful (bcrypt authenticated)', ''],
    ['2. Briefing participation', 'Identify open jobs from prior day', ''],
    [''],
    ['Transaction Checklist'],
    ['Task', 'Required Fields / Actions', 'Expected Outcome'],
    ['1. Customer Selection', 'Generate Customer Passport ID', 'Creates customer record'],
    ['2. Job Card Creation', 'Log VIN, KM, Customer Complaints', 'Saves Job Card as OPEN'],
    ['3. Estimate Draft', 'Select Part and Labour Codes', 'Saves Estimate as DRAFT'],
    ['4. Estimate Approval', 'Capture signature / SMS validation', 'Transitions state to APPROVED'],
    [''],
    ['End of Day Checklist'],
    ['Task', 'Verification Point', 'Status (Y/N)'],
    ['1. Check pending estimates', 'Follow up on DRAFT status jobs', ''],
    ['2. Submit handovers', 'Notify supervisor of urgent tasks', ''],
  ],
  'Floor Supervisor': [
    ['Morning Checklist'],
    ['Task', 'Verification Point', 'Status (Y/N)'],
    ['1. Device check & Login', 'Supervisor dashboard populated', ''],
    ['2. Bay Status Verification', 'Verify empty bays vs active allocations', ''],
    [''],
    ['Transaction Checklist'],
    ['Task', 'Required Fields / Actions', 'Expected Outcome'],
    ['1. Allocate Bay', 'Select approved Job Card & target bay', 'Transitions state to ASSIGNED'],
    ['2. Assign Technician', 'Select active tech from roster', 'Tech workspace displays job'],
    ['3. Approve Parts Issue', 'Authorize store requisition request', 'Requisition sent to store desk'],
    ['4. QC Checklist Audit', 'Execute road-test checklist steps', 'Job card status to QC_PASSED'],
    [''],
    ['End of Day Checklist'],
    ['Task', 'Verification Point', 'Status (Y/N)'],
    ['1. Shift Handover', 'Ensure all technician tasks are paused', ''],
    ['2. Clear In-Memory State', 'Confirm zero stranded jobs in memory', ''],
    ['3. System Restart Trigger', 'Authorize system reboot at shift change', ''],
  ],
  'Store Manager': [
    ['Morning Checklist'],
    ['Task', 'Verification Point', 'Status (Y/N)'],
    ['1. Inventory system check', 'Stock levels matching prior day close', ''],
    ['2. Login to Stores Console', 'Store requisition queue accessible', ''],
    [''],
    ['Transaction Checklist'],
    ['Task', 'Required Fields / Actions', 'Expected Outcome'],
    ['1. Parts Issue', 'Settle approved requisition item', 'Reduces stock, logs Parts Issue'],
    ['2. Receive Purchase Order', 'Log parts arrival in master ledger', 'Increases catalog quantities'],
    [''],
    ['End of Day Checklist'],
    ['Task', 'Verification Point', 'Status (Y/N)'],
    ['1. Physical count reconciliation', 'Reconcile high-value items vs system', ''],
    ['2. Lock store room', 'Secure physical inventory assets', ''],
  ],
  'Cashier & Accounts': [
    ['Morning Checklist'],
    ['Task', 'Verification Point', 'Status (Y/N)'],
    ['1. Settle terminal launch', 'Verify cash float balance', ''],
    ['2. Login to cashier console', 'Access invoice queue', ''],
    [''],
    ['Transaction Checklist'],
    ['Task', 'Required Fields / Actions', 'Expected Outcome'],
    ['1. Settle Invoice', 'Select payment mode (Cash/UPI/Card)', 'Saves payment, state: SETTLED'],
    ['2. Print Tax Invoice', 'Verify details and print invoice slip', 'Invoice copy handed to customer'],
    ['3. Issue Gate Pass', 'Verify settlement and issue exit code', 'Gate Exit terminal updated'],
    [''],
    ['End of Day Checklist'],
    ['Task', 'Verification Point', 'Status (Y/N)'],
    ['1. Cash & Card reconciliation', 'System invoice sum matches physical cash', ''],
    ['2. Manual GST reconciliation', 'Verify taxes matches target ledger', ''],
  ],
};

const wb = XLSX.utils.book_new();

for (const [sheetName, rows] of Object.entries(sheetsData)) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

const targetPath = path.resolve('C:\\Users\\arhaa\\.gemini\\antigravity-ide\\brain\\1d678037-4e9a-42a3-a88a-d370863282b5\\DWIP_PILOT_CHECKLIST_MASTER.xlsx');
XLSX.writeFile(wb, targetPath);
console.log(`Successfully generated Excel sheet: ${targetPath}`);
