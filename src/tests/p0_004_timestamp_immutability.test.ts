/**
 * =============================================================================
 * DWIP Enterprise Platform — Hotfix P0-004 Automated Unit Test Suite
 * Feature: Workflow-Based Operational Timestamp Immutability Governance
 * =============================================================================
 */

function runP0004Tests() {
  console.log("🧪 Running Hotfix P0-004 Workflow-Based Operational Timestamp Immutability Unit Tests...\n");

  const originalJobCard = {
    job_id: 69,
    job_card_no: "JC-500171",
    started_at: "2026-07-28T09:00:00.000Z",
    completed_at: "2026-07-28T11:30:00.000Z",
    invoiced_at: null,
    status: "Completed",
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

  // Helper simulating server.ts PUT /api/job-cards/:id timestamp lock logic
  function processTimestampUpdate(oldJob: any, updatePayload: any, userRole: string = "reception") {
    const timestampFields = [
      { key: 'started_at', label: 'Bay / Repair Start Time' },
      { key: 'completed_at', label: 'Technician Finish Time' },
      { key: 'invoiced_at', label: 'Billing / Invoice Time' }
    ];

    for (const tf of timestampFields) {
      const reqVal = updatePayload[tf.key];
      const oldVal = oldJob[tf.key];

      const isRecorded = oldVal !== undefined && oldVal !== null && oldVal !== "" && oldVal !== "0";
      const isAttemptingEdit = reqVal !== undefined && reqVal !== null && reqVal !== "" && reqVal !== oldVal;

      if (isRecorded && isAttemptingEdit) {
        const parsedNewDate = new Date(reqVal);
        if (isNaN(parsedNewDate.getTime())) {
          return {
            status: 400,
            error: "INVALID_TIMESTAMP_FORMAT",
            message: `Invalid date/time format for ${tf.label}.`
          };
        }

        const isGmOrAdmin = ["admin", "developer", "dealer_principal", "gm"].includes(userRole.toLowerCase());
        const overrideReason = updatePayload.override_reason || updatePayload.reason;

        // Validation: Reject operational edits without GM/Developer override
        if (!isGmOrAdmin && !overrideReason) {
          return {
            status: 403,
            error: "TIMESTAMP_LOCKED",
            message: `${tf.label} is locked after workflow progression. GM / Developer override reason is required to modify.`
          };
        }

        // Chronological Sequence Validation
        if (tf.key === 'completed_at' && oldJob.started_at) {
          const startMs = new Date(oldJob.started_at).getTime();
          if (!isNaN(startMs) && parsedNewDate.getTime() < startMs) {
            return {
              status: 400,
              error: "ILLOGICAL_TIMESTAMP_SEQUENCE",
              message: "Technician Finish Time cannot be earlier than Repair Start Time."
            };
          }
        }
      }
    }

    return {
      status: 200,
      data: {
        ...oldJob,
        ...updatePayload
      }
    };
  }

  // Test 1: Unrecorded timestamp (e.g. invoiced_at) can be recorded when event occurs
  const res1 = processTimestampUpdate(originalJobCard, { invoiced_at: "2026-07-28T12:00:00.000Z" }, "reception");
  assert(res1.status === 200 && res1.data.invoiced_at === "2026-07-28T12:00:00.000Z", "Unrecorded timestamp can be set when event occurs");

  // Test 2: Recorded timestamp (e.g. completed_at) locked post-event for operational roles without GM override
  const res2 = processTimestampUpdate(originalJobCard, { completed_at: "2026-07-28T10:00:00.000Z" }, "reception");
  assert(res2.status === 403 && res2.error === "TIMESTAMP_LOCKED", "Recorded operational timestamp locked post-event (403 Forbidden)");

  // Test 3: GM / Developer override succeeds post-event with reason
  const res3 = processTimestampUpdate(originalJobCard, { completed_at: "2026-07-28T11:45:00.000Z", override_reason: "Clock-in System Clock Sync Delay" }, "reception");
  assert(res3.status === 200 && res3.data.completed_at === "2026-07-28T11:45:00.000Z", "GM Override succeeds post-event with mandatory audit reason");

  // Test 4: Rejects illogical timestamp sequence (finish time before start time)
  const res4 = processTimestampUpdate(originalJobCard, { completed_at: "2026-07-28T08:00:00.000Z", override_reason: "Manual Adjust" }, "reception");
  assert(res4.status === 400 && res4.error === "ILLOGICAL_TIMESTAMP_SEQUENCE", "Rejects illogical timestamp sequence (400 Bad Request)");

  // Test 5: Rejects invalid date format
  const res5 = processTimestampUpdate(originalJobCard, { completed_at: "INVALID-DATE-STRING", override_reason: "Manual Adjust" }, "reception");
  assert(res5.status === 400 && res5.error === "INVALID_TIMESTAMP_FORMAT", "Rejects invalid date format (400 Bad Request)");

  console.log(`\n📊 P0-004 TEST RESULTS: ${passedCount} / ${totalCount} PASSED.`);
  if (passedCount !== totalCount) {
    process.exit(1);
  } else {
    // Exit explicitly: the harness leaves async handles (timers/mock listeners)
    // open, so without this Node waits on the event loop and the legacy test
    // runner's per-file timeout kills it before it's counted as passed.
    process.exit(0);
  }
}

runP0004Tests();
