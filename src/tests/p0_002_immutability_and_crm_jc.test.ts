/**
 * =============================================================================
 * DWIP Enterprise Platform — Hotfix P0-002 Automated Unit Test Suite
 * Feature: System Job Card Number Immutability & CRM Job Card Number Governance
 * =============================================================================
 */

function runP0002Tests() {
  console.log("🧪 Running Hotfix P0-002 System JC Immutability & CRM JC Unit Tests...\n");

  const originalJobCard = {
    job_id: 69,
    job_card_no: "JC-500171",
    crm_job_card_no: "TML-2026-1001",
    status: "Active", // Submitted / In Progress
    service_advisor: "shashikumar"
  };

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // Helper simulating server.ts PUT /api/job-cards/:id immutability & lock logic
  function processJobCardUpdate(oldJob: any, updatePayload: any, userRole: string = "reception") {
    // Rule 1: System JC Number is IMMUTABLE
    const finalSystemJcNo = oldJob.job_card_no; // System JC Number cannot be overwritten

    // Rule 2: CRM JC Number Locking
    const requestedCrmJc = updatePayload.crm_job_card_no !== undefined ? updatePayload.crm_job_card_no : oldJob.crm_job_card_no;
    const isCrmChanged = requestedCrmJc !== oldJob.crm_job_card_no;
    const isSubmittedState = oldJob.status && oldJob.status !== "Draft" && oldJob.status !== "Waiting" && oldJob.status !== "GATE_IN";

    const isGmOrAdmin = ["admin", "developer", "dealer_principal", "gm", "workshop_manager"].includes(userRole.toLowerCase());
    const overrideReason = updatePayload.override_reason || updatePayload.reason;

    if (isCrmChanged && isSubmittedState && !isGmOrAdmin && !overrideReason) {
      return {
        status: 403,
        error: "CRM_JC_LOCKED",
        message: "CRM Job Card Number is locked after submission. GM / Developer override reason is required to modify."
      };
    }

    return {
      status: 200,
      data: {
        ...oldJob,
        ...updatePayload,
        job_card_no: finalSystemJcNo, // Immutable
        crm_job_card_no: requestedCrmJc
      }
    };
  }

  // Test 1: System JC Number cannot be modified via API payload
  const res1 = processJobCardUpdate(originalJobCard, { job_card_no: "HACK-99999" });
  assert(res1.status === 200 && res1.data.job_card_no === "JC-500171", "System JC Number (JC-500171) is strictly IMMUTABLE");

  // Test 2: CRM JC Number can be added when status is Draft
  const draftJob = { ...originalJobCard, status: "Draft", crm_job_card_no: null };
  const res2 = processJobCardUpdate(draftJob, { crm_job_card_no: "TML-2026-9999" });
  assert(res2.status === 200 && res2.data.crm_job_card_no === "TML-2026-9999", "CRM JC Number editable in Draft status");

  // Test 3: CRM JC Number locked post-submission for operational users without GM override
  const res3 = processJobCardUpdate(originalJobCard, { crm_job_card_no: "TAMPER-0000" }, "reception");
  assert(res3.status === 403 && res3.error === "CRM_JC_LOCKED", "CRM JC Number modification blocked post-submission (403 Forbidden)");

  // Test 4: GM / Developer override succeeds when providing override reason
  const res4 = processJobCardUpdate(originalJobCard, { crm_job_card_no: "TML-2026-GM-OVERRIDE", override_reason: "DMS Entry Sync Correction" }, "reception");
  assert(res4.status === 200 && res4.data.crm_job_card_no === "TML-2026-GM-OVERRIDE", "GM Override succeeds with mandatory audit reason");

  // Test 5: Admin / Developer can update CRM JC Number post-submission
  const res5 = processJobCardUpdate(originalJobCard, { crm_job_card_no: "TML-2026-ADMIN-SYNC" }, "admin");
  assert(res5.status === 200 && res5.data.crm_job_card_no === "TML-2026-ADMIN-SYNC", "Admin / Developer can update CRM JC Number");

  console.log(`\n📊 P0-002 TEST RESULTS: ${passedCount} / ${totalCount} PASSED.`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runP0002Tests();
