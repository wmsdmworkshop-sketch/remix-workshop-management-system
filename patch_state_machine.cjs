const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Ensure jobCardService instance exists
if (!code.includes('const jobCardService = new JobCardService();')) {
    code = code.replace(
        'import { JobCardService } from "./src/core/application-services.ts";',
        'import { JobCardService } from "./src/core/application-services.ts";\nconst jobCardService = new JobCardService();'
    );
}

// 2. Fix start-repair
const startRepairRegex = /cachedDB\.jobCards\[jobCardIndex\] = \{[\s\S]*?started_by:\s*started_by\s*\};/;
code = code.replace(startRepairRegex, `await jobCardService.transitionStatus(jobId, { status: "In Progress", started_at: new Date().toISOString(), started_by: started_by }, null, []);`);

// 3. Fix qc-check
const qcCheckRegex = /cachedDB\.jobCards\[index\] = \{[\s\S]*?qc_checklist:\s*checklist\s*\|\|\s*\[\]\s*\};/;
code = code.replace(qcCheckRegex, `await jobCardService.transitionStatus(jobId, { status: newStatus, qc_status: qc_status, qc_checked_by: checked_by || null, qc_checked_at: new Date().toISOString(), qc_fail_reason: fail_reason || null, qc_checklist: checklist || [] }, null, []);`);

// 4. Fix pre-invoice
const preInvoiceRegex = /cachedDB\.jobCards\[index\] = \{[\s\S]*?pre_invoice_no:\s*invoice_no\s*\};\s*saveDB\(cachedDB\);\s*await syncSave\(cachedDB\);/;
code = code.replace(preInvoiceRegex, `await jobCardService.transitionStatus(jobId, { status: newStatus, pre_invoice_no: invoice_no }, null, []);`);

// 5. Fix manager-approve
const managerApproveRegex = /cachedDB\.jobCards\[index\] = \{[\s\S]*?manager_approved_at:\s*new Date\(\)\.toISOString\(\)\s*\};\s*saveDB\(cachedDB\);\s*await syncSave\(cachedDB\);/;
code = code.replace(managerApproveRegex, `await jobCardService.transitionStatus(jobId, { status: newStatus, manager_approved_by: approved_by || null, manager_approval_notes: notes || null, manager_approved_at: new Date().toISOString() }, null, []);`);

// 6. Fix bill
const billRegex = /cachedDB\.jobCards\[index\] = \{[\s\S]*?invoice_no:\s*invoice_no\s*\};/;
code = code.replace(billRegex, `await jobCardService.transitionStatus(jobId, { status: 'Invoiced', billing_status: 'Invoiced', invoice_no: invoice_no }, null, []);`);

fs.writeFileSync('server.ts', code);
console.log("server.ts patched successfully with JobCardService.transitionStatus");
