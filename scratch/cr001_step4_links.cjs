/**
 * CR-001 Step 4: User Link Validation Reports Generator (FIXED)
 */

const fs = require('fs');

async function run() {
  const auditData = JSON.parse(fs.readFileSync('scratch/cr001_audit_data.json', 'utf8'));
  const links = auditData.userEmployeeLinks;

  console.log('=== STEP 4: USER LINK VALIDATION ===');

  const mismatches = [];

  for (const link of links) {
    if (!link.name_match || !link.role_match) {
      if (link.employee_id === 0) {
        continue;
      }

      let suggestedMatch = 'N/A';
      let confidence = 'Low';
      let reason = 'Needs manual lookup';

      if (link.username === 'qadeer') {
        suggestedMatch = 'ABDUL QADEER (employee_id=2)';
        confidence = 'High';
        reason = 'Exact name match ("Qadeer" vs "ABDUL QADEER") and role match ("billing" vs "BILLER").';
      } else if (link.username === 'RAGU') {
        suggestedMatch = 'RAGHAVENDRA KULKARNI (employee_id=26)';
        confidence = 'High';
        reason = 'Username "RAGU" maps to "RAGHAVENDRA" and both have Supervisor/Floor Incharge roles.';
      } else if (link.username === 'manju') {
        suggestedMatch = 'MANJUNATH (employee_id=14)';
        confidence = 'High';
        reason = 'Name match ("Manju" vs "MANJUNATH") and role match ("Warranty" vs "WARRANTY ASSISTANT").';
      } else if (link.username === 'PK') {
        suggestedMatch = 'PRAHLAD KULKARNI (employee_id=25)';
        confidence = 'High';
        reason = 'Initials "PK" match "PRAHLAD KULKARNI" and role match ("Supervisor" vs "SUPERVISOR").';
      } else if (link.username === 'AHMED') {
        suggestedMatch = 'AHMED HUSSAIN (employee_id=40)';
        confidence = 'High';
        reason = 'Name match ("Ahmed" vs "AHMED HUSSAIN") and role match ("Service Manager" vs "SUPERVISOR/Management Trainee").';
      } else if (link.username === 'chetan') {
        suggestedMatch = 'CHETAN (None)';
        confidence = 'Low';
        reason = 'No employee named Chetan exists in the employees list. May require a new employee record.';
      }

      mismatches.push({
        user_id: link.user_id,
        username: link.username,
        employee_id: link.employee_id,
        employee_name: link.emp_full_name,
        suggestedMatch,
        confidence,
        reason,
        status: 'MANUAL REVIEW REQUIRED'
      });
    }
  }

  // Let's write Employee_Mismatch_Report.md
  let mismatchMd = `# Employee Mismatch Report\n\n` +
    `**Date:** 2026-07-11  \n` +
    `**Project:** DWIP v2 Foundation Stabilization  \n` +
    `**Phase:** Sprint 1 — Master Data Cleanup (CR-001)\n\n` +
    `---\n\n` +
    `## 1. Mismatched User-Employee Links\n\n` +
    `The following active user accounts have mismatched \`employee_id\` links pointing to the wrong employee record. ` +
    `Per final decision, **no automatic repairs have been made**. All records are marked as **"MANUAL REVIEW REQUIRED"** and left unchanged until approved.\n\n`;

  mismatches.forEach(m => {
    mismatchMd += `### User: ${m.username} (User ID: ${m.user_id})\n` +
      `*   **Username:** \`${m.username}\`\n` +
      `*   **Linked Employee ID:** \`${m.employee_id}\`\n` +
      `*   **Linked Employee Name:** \`${m.employee_name}\`\n` +
      `*   **Suggested Match:** **${m.suggestedMatch}**\n` +
      `*   **Confidence:** \`${m.confidence}\`\n` +
      `*   **Status:** \`${m.status}\`\n` +
      `*   **Reasoning:** ${m.reason}\n\n` +
      `---\n\n`;
  });

  fs.writeFileSync('scratch/mismatches.json', JSON.stringify(mismatches, null, 2));

  // Let's write User_Employee_Link_Report.md
  let linkReportMd = `# User Employee Link Report\n\n` +
    `**Date:** 2026-07-11  \n` +
    `**Project:** DWIP v2 Foundation Stabilization  \n` +
    `**Phase:** Sprint 1 — Master Data Cleanup (CR-001)\n\n` +
    `---\n\n` +
    `## 1. User-Employee Link Analysis\n\n` +
    `| User ID | Username | Role | Linked Employee ID | Linked Employee Name | Status |\n` +
    `| :---: | :--- | :--- | :---: | :--- | :--- |\n`;

  links.forEach(link => {
    let status = '✅ MATCH';
    if (link.employee_id === 0) {
      status = 'ℹ️ SYSTEM ACCOUNT (No Employee)';
    } else if (!link.name_match || !link.role_match) {
      status = '❌ MANUAL REVIEW REQUIRED';
    }
    linkReportMd += `| ${link.user_id} | \`${link.username}\` | \`${link.user_role}\` | ${link.employee_id} | ${link.emp_full_name || 'N/A'} | ${status} |\n`;
  });

  linkReportMd += `\n` +
    `---\n\n` +
    `## 2. Action Plan for Manual Review\n\n` +
    `1.  **Chetan:** No employee record for Chetan exists. A new employee profile must be created first before mapping his user ID.\n` +
    `2.  **Qadeer, Ragu, Manju, PK, Ahmed:** Mappings must be updated to reference correct employee IDs (2, 26, 14, 25, 40 respectively) after manager approval.\n` +
    `3.  **Shashi username typo:** The user account username has a typo \`sahsi\` but the employee record name is correct. This is flagged for rename.\n`;

  fs.writeFileSync('scratch/Employee_Mismatch_Report.md', mismatchMd);
  fs.writeFileSync('scratch/User_Employee_Link_Report.md', linkReportMd);
  console.log('Generated local MD reports.');
}

run().catch(console.error);
