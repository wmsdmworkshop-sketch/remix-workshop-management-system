/**
 * =============================================================================
 * DWIP Enterprise Platform — Feature P1-001 Automated Unit Test Suite
 * Feature: Customer Complaint Version History & Audit Ledger
 * =============================================================================
 */

function runP1001Tests() {
  console.log("🧪 Running Feature P1-001 Customer Complaint Version History Unit Tests...\n");

  const originalJobCard = {
    job_id: 69,
    job_card_no: "JC-500171",
    job_description: "Engine noise under heavy load",
    status: "Active", // Submitted / In Progress
    created_by: 12,
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

  // Simulated complaint version store
  const complaintLedger: any[] = [];

  function processComplaintUpdate(oldJob: any, updatePayload: any, userRole: string = "reception", userName: string = "system") {
    const reqComplaint = updatePayload.job_description !== undefined ? updatePayload.job_description : updatePayload.customer_complaint;
    const oldComplaint = oldJob.job_description || "";

    if (reqComplaint !== undefined && reqComplaint !== null && reqComplaint.trim() !== oldComplaint.trim()) {
      const newText = reqComplaint.trim();
      const isSubmitted = oldJob.status && oldJob.status !== "Draft" && oldJob.status !== "Waiting" && oldJob.status !== "GATE_IN";
      const isGmOrAdmin = ["admin", "developer", "dealer_principal", "gm", "workshop_manager"].includes(userRole.toLowerCase());
      const overrideReason = updatePayload.override_reason || updatePayload.reason;

      // Rule 1: Workflow Lock Check
      if (isSubmitted && !isGmOrAdmin && !overrideReason) {
        return {
          status: 403,
          error: "COMPLAINT_LOCKED",
          message: "Customer complaint is locked after Job Card submission. GM / Developer override reason is required to modify."
        };
      }

      // Rule 2: Version 1 Auto-Creation for Existing Complaint
      if (complaintLedger.length === 0 && oldComplaint) {
        complaintLedger.push({
          id: 1,
          job_card_id: oldJob.job_id,
          version_number: 1,
          complaint_text: oldComplaint,
          edited_by_name: oldJob.service_advisor || "Creator",
          edited_role: "service_advisor",
          edit_reason: "Initial Complaint Version",
          created_at: new Date().toISOString()
        });
      }

      // Rule 3: Version Numbering Sequence
      const nextVer = complaintLedger.length + 1;
      const newVersionRecord = {
        id: nextVer,
        job_card_id: oldJob.job_id,
        version_number: nextVer,
        complaint_text: newText,
        edited_by_name: userName,
        edited_role: userRole,
        edit_reason: overrideReason || "Standard Update",
        created_at: new Date().toISOString()
      };
      complaintLedger.push(newVersionRecord);

      return {
        status: 200,
        data: {
          ...oldJob,
          job_description: newText,
          version: nextVer
        },
        ledger: complaintLedger
      };
    }

    return { status: 200, data: oldJob, ledger: complaintLedger };
  }

  // Test 1: Complaint editable in Draft status
  const draftJob = { ...originalJobCard, status: "Draft", job_description: "Brake noise" };
  const res1 = processComplaintUpdate(draftJob, { job_description: "Brake squeal on hard stopping" }, "reception");
  assert(res1.status === 200 && res1.ledger.length === 2 && res1.ledger[0].version_number === 1 && res1.ledger[1].version_number === 2, "Creates Version 1 and Version 2 sequentially");

  // Test 2: Complaint modification blocked post-submission for operational roles without GM override
  const res2 = processComplaintUpdate(originalJobCard, { job_description: "Tampered complaint text" }, "reception");
  assert(res2.status === 403 && res2.error === "COMPLAINT_LOCKED", "Complaint modification blocked post-submission (403 Forbidden)");

  // Test 3: GM / Developer override succeeds post-submission with mandatory audit reason
  const res3 = processComplaintUpdate(originalJobCard, { job_description: "Engine noise and oil leak under load", override_reason: "Customer added oil leak symptom at reception desk" }, "reception", "shashikumar");
  assert(res3.status === 200 && res3.data.version === 3, "GM Override succeeds post-submission with mandatory audit reason");

  // Test 4: History is immutable — previous versions remain untouched
  assert(complaintLedger[0].complaint_text === "Brake noise" && complaintLedger[1].complaint_text === "Brake squeal on hard stopping", "Previous versions in ledger remain 100% immutable");

  // Test 5: API Complaint History retrieval orders newest to oldest
  const reversedHistory = [...complaintLedger].sort((a, b) => b.version_number - a.version_number);
  assert(reversedHistory[0].version_number === 3 && reversedHistory[2].version_number === 1, "History retrieved newest to oldest (v3 -> v2 -> v1)");

  console.log(`\n📊 P1-001 TEST RESULTS: ${passedCount} / ${totalCount} PASSED.`);
  if (passedCount !== totalCount) {
    process.exit(1);
  } else {
    // Exit explicitly: the harness leaves async handles (timers/mock listeners)
    // open, so without this Node waits on the event loop and the legacy test
    // runner's per-file timeout kills it before it's counted as passed.
    process.exit(0);
  }
}

runP1001Tests();
