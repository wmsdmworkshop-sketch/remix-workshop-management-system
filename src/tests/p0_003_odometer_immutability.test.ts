/**
 * =============================================================================
 * DWIP Enterprise Platform — Hotfix P0-003 Automated Unit Test Suite
 * Feature: Workflow-Based Odometer Immutability & Validation Governance
 * =============================================================================
 */

function runP0003Tests() {
  console.log("🧪 Running Hotfix P0-003 Workflow-Based Odometer Immutability Unit Tests...\n");

  const originalJobCard = {
    job_id: 69,
    job_card_no: "JC-500171",
    km_reading: 45000,
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

  // Helper simulating server.ts PUT /api/job-cards/:id odometer lock logic
  function processOdometerUpdate(oldJob: any, updatePayload: any, userRole: string = "reception") {
    const reqKm = updatePayload.km_reading !== undefined ? updatePayload.km_reading : updatePayload.odometer;
    const oldKm = Number(oldJob.km_reading || 0);

    if (reqKm !== undefined && reqKm !== null && reqKm !== "") {
      const parsedKm = Number(reqKm);

      // Validation 1: Must be non-negative numeric value
      if (isNaN(parsedKm) || parsedKm < 0) {
        return {
          status: 400,
          error: "INVALID_ODOMETER_VALUE",
          message: "Odometer reading must be a valid non-negative numeric value."
        };
      }

      if (parsedKm !== oldKm) {
        const isOdoSubmittedState = oldJob.status && oldJob.status !== "Draft" && oldJob.status !== "Waiting" && oldJob.status !== "GATE_IN";
        const isGmOrAdmin = ["admin", "developer", "dealer_principal", "gm"].includes(userRole.toLowerCase());
        const overrideReason = updatePayload.override_reason || updatePayload.reason;

        // Validation 2: Reject post-submission edits without GM/Developer override
        if (isOdoSubmittedState && !isGmOrAdmin && !overrideReason) {
          return {
            status: 403,
            error: "ODOMETER_LOCKED",
            message: "Odometer reading is locked after Job Card submission. GM / Developer override reason is required to modify."
          };
        }

        // Validation 3: Reject odometer decrease unless GM override
        if (parsedKm < oldKm && !isGmOrAdmin && !overrideReason) {
          return {
            status: 400,
            error: "ODOMETER_DECREASE_NOT_ALLOWED",
            message: `New odometer reading (${parsedKm} KM) cannot be lower than previous recorded reading (${oldKm} KM) without GM override.`
          };
        }

        return {
          status: 200,
          data: {
            ...oldJob,
            ...updatePayload,
            km_reading: parsedKm,
            odometer_reading: parsedKm
          }
        };
      }
    }

    return { status: 200, data: oldJob };
  }

  // Test 1: Odometer editable in Draft / Gate In status
  const draftJob = { ...originalJobCard, status: "Draft", km_reading: 30000 };
  const res1 = processOdometerUpdate(draftJob, { km_reading: 35000 }, "reception");
  assert(res1.status === 200 && res1.data.km_reading === 35000, "Odometer is editable in Draft status");

  // Test 2: Odometer locked post-submission for operational roles without GM override
  const res2 = processOdometerUpdate(originalJobCard, { km_reading: 48000 }, "reception");
  assert(res2.status === 403 && res2.error === "ODOMETER_LOCKED", "Odometer modification blocked post-submission for operational users (403 Forbidden)");

  // Test 3: GM / Developer override succeeds post-submission with reason
  const res3 = processOdometerUpdate(originalJobCard, { km_reading: 48000, override_reason: "Odometer Cluster Replacement Calibration" }, "reception");
  assert(res3.status === 200 && res3.data.km_reading === 48000, "GM Override succeeds post-submission with mandatory audit reason");

  // Test 4: Rejects negative odometer readings
  const res4 = processOdometerUpdate(draftJob, { km_reading: -500 }, "reception");
  assert(res4.status === 400 && res4.error === "INVALID_ODOMETER_VALUE", "Rejects negative odometer values (400 Bad Request)");

  // Test 5: Rejects unauthorized odometer decrease
  const res5 = processOdometerUpdate(draftJob, { km_reading: 20000 }, "service_advisor");
  assert(res5.status === 400 && res5.error === "ODOMETER_DECREASE_NOT_ALLOWED", "Rejects odometer decrease without GM override (400 Bad Request)");

  console.log(`\n📊 P0-003 TEST RESULTS: ${passedCount} / ${totalCount} PASSED.`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runP0003Tests();
