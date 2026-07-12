// =============================================================================
// CR-002: Event Engine Validation with 20 Real Job Cards (Milestone M1)
// Execution: npx tsx src/tests/validate-20-job-cards.ts
// =============================================================================

import { pool as db } from "../db/index";
import {
  OperationalEventRepository,
  OperationalEventService,
  LiveTatService,
  ReplayEngine
} from "../core/event-engine";
import { EventBus } from "../core/event-bus";

async function runValidation() {
  console.log("=============================================================================");
  console.log("STARTING EVENT ENGINE VALIDATION ON 20 JOB CARDS");
  console.log("=============================================================================");

  const eventBus = new EventBus();
  const repo = new OperationalEventRepository(db);
  const service = new OperationalEventService(repo, eventBus);

  // 1. Fetch 20 legacy/real job cards for simulation
  const [jobCards] = await db.query(
    "SELECT * FROM backup_legacy_job_cards LIMIT 20"
  ) as any[];

  if (jobCards.length < 20) {
    console.error(`Not enough job cards in backup_legacy_job_cards. Found: ${jobCards.length}`);
    process.exit(1);
  }

  console.log(`Loaded ${jobCards.length} actual job cards from backup_legacy_job_cards.`);

  let totalEventsPublished = 0;
  const simulatedJobIds: number[] = [];

  try {
    // 2. Loop through 20 job cards and simulate in parallel
    const promises = jobCards.map(async (jc, i) => {
      const simulatedJobId = 1000 + i;
      const jobCardNo = `JC-SIM-${simulatedJobId}`;
      simulatedJobIds.push(simulatedJobId);

      const correlationId = `CORR-VAL-${simulatedJobId}`;
      const baseTime = Date.now() - (24 * 60 * 60 * 1000) * (i + 1); // Varied start times

      // Unique timeline profiles to simulate real floor variations (reworks, delays, etc.)
      const hasRework = i % 4 === 0; // Rework on every 4th job card
      const diagnosticDelay = (i % 3) * 15; // 0, 15, or 30 mins delay
      const repairDuration = 60 + (i % 5) * 30; // 60, 90, 120, 150, 180 mins repair
      const billingDelay = 10 + (i % 2) * 20; // 10 or 30 mins billing latency

      // Clear any previous events for this simulated job ID to ensure test cleanliness
      await db.execute("DELETE FROM tbl_workflow_history WHERE job_id = ?", [simulatedJobId]);

      // Simulate timeline steps with UTC timestamps
      const publishSim = async (type: string, category: any, source: any, deltaMinutes: number, payload?: any, remarks?: string) => {
        const timestamp = new Date(baseTime + deltaMinutes * 60 * 1000).toISOString();
        const seq = (await repo.getNextSequenceNumber(simulatedJobId));
        
        const event = {
          event_id: `EV-VAL-${simulatedJobId}-${seq}`,
          job_id: simulatedJobId,
          job_card_no: jobCardNo,
          timestamp,
          user: jc.service_advisor || "Jane Smith",
          role: "Service Advisor",
          workshop_id: jc.workshop_id || 1,
          source,
          event_category: category,
          event_type: type,
          remarks: remarks || null,
          correlation_id: correlationId,
          parent_event_id: null,
          sequence_number: seq,
          source_system: "WMS-Core",
          event_version: "1.0",
          event_status: "PROCESSED",
          payload: payload || null
        };

        // Append directly to keep simulated timestamps intact
        console.log(`[DEBUG] Publishing ${type} for job ${simulatedJobId} (seq: ${seq})...`);
        await repo.append(event);
        console.log(`[DEBUG] Published ${type} for job ${simulatedJobId}.`);
        totalEventsPublished++;
      };

      // Construct events timeline:
      let t = 0;
      await publishSim("VEHICLE_GATE_IN", "CCTV", "CCTV", t);
      
      t += 10;
      await publishSim("INTAKE_INITIALIZED", "Operational", "MANUAL", t);
      
      t += 20;
      await publishSim("DIAGNOSTIC_STARTED", "Operational", "MANUAL", t);
      
      t += 30 + diagnosticDelay;
      await publishSim("ESTIMATE_PREPARED", "Operational", "API", t);
      
      t += 15;
      await publishSim("ESTIMATE_APPROVED", "Operational", "API", t);
      
      t += 10;
      await publishSim("TECHNICIAN_ASSIGNED", "Operational", "MANUAL", t, { employee_id: 10 + i, role_type: "Primary Technician" });
      
      t += 5;
      await publishSim("WIP_STARTED", "Operational", "QR", t);

      if (hasRework) {
        t += repairDuration / 2;
        await publishSim("QC_SUBMITTED", "Operational", "MOBILE", t);
        
        t += 15;
        await publishSim("QC_FAILED", "Operational", "MOBILE", t, null, "Brake pad loose");
        
        t += 15; // Rework wait
        await publishSim("WIP_STARTED", "Operational", "QR", t);
        
        t += repairDuration / 2;
        await publishSim("QC_SUBMITTED", "Operational", "MOBILE", t);
      } else {
        t += repairDuration;
        await publishSim("QC_SUBMITTED", "Operational", "MOBILE", t);
      }

      t += 5;
      await publishSim("FINAL_REVIEW_STARTED", "Operational", "MOBILE", t);
      
      t += billingDelay;
      await publishSim("INVOICE_GENERATED", "Integration", "ORACLE_IMPORT", t, { invoice_no: `IDEVAN2026${simulatedJobId}` });
      
      t += 10;
      await publishSim("VEHICLE_RELEASED", "CCTV", "CCTV", t);
    });

    await Promise.all(promises);
    console.log(`Successfully generated and stored ${totalEventsPublished} events across 20 Job Cards.`);

    // 3. Replay and validate each job card
    console.log("\n=== RUNNING READ-ONLY REPLAY VALIDATION ===");
    let successfulReplays = 0;

    for (const simId of simulatedJobIds) {
      const events = await repo.findByJobId(simId);
      const replay = ReplayEngine.replay(events);

      const expectedRework = (simId - 1000) % 4 === 0 ? 1 : 0;
      const isStateCorrect = replay.workflowStatus === "GATE_OUT";
      const isQueueCorrect = replay.queue === "DELIVERY_QUEUE";
      const isReworkCorrect = replay.reworkCount === expectedRework;
      const isTatCorrect = replay.tat.totalTatMs > 0;

      if (isStateCorrect && isQueueCorrect && isReworkCorrect && isTatCorrect) {
        successfulReplays++;
        console.log(`[OK] Job ${replay.job_card_no} — Final State: ${replay.workflowStatus}, Reworks: ${replay.reworkCount}, Total TAT: ${Math.round(replay.tat.totalTatMs / 60000)} mins`);
      } else {
        console.error(`[ERROR] Replay mismatch on Job ${replay.job_card_no}. State OK: ${isStateCorrect}, Rework OK: ${isReworkCorrect}`);
      }
    }

    console.log("\n=== LIVE TAT VS ACTUAL RECORD COMPARISON ===");
    // Compare calculated Live TAT with actual backup job card durations (if available)
    for (let i = 0; i < 5; i++) {
      const simId = simulatedJobIds[i];
      const events = await repo.findByJobId(simId);
      const replay = ReplayEngine.replay(events);
      const legacyCard = jobCards[i];
      
      console.log(`Job Card: ${replay.job_card_no}`);
      console.log(`  Calculated Live Total TAT: ${Math.round(replay.tat.totalTatMs / 60000)} mins`);
      console.log(`  Calculated Diagnostic Time: ${Math.round(replay.tat.diagnosticTimeMs / 60000)} mins`);
      console.log(`  Calculated Active WIP Time: ${Math.round(replay.tat.activeWipMs / 60000)} mins`);
      console.log(`  Calculated Billing Latency: ${Math.round(replay.tat.billingLatencyMs / 60000)} mins`);
      console.log(`  Legacy Static Duration: ${legacyCard.total_duration_mins || "N/A (No duration recorded)"} mins`);
    }

    globalThis.successfulReplaysCount = successfulReplays;
  } catch (error) {
    console.error("Validation loop encountered an error:", error);
  }

  const successfulReplays = (globalThis as any).successfulReplaysCount || 0;
  console.log("=============================================================================");
  console.log(`VALIDATION COMPLETED: ${successfulReplays}/20 Job Cards replayed perfectly.`);
  console.log("=============================================================================");

  // Cleanup simulation events from the DB
  for (const simId of simulatedJobIds) {
    await db.execute("DELETE FROM tbl_workflow_history WHERE job_id = ?", [simId]);
  }
  
  process.exit(successfulReplays === 20 ? 0 : 1);
}

runValidation().catch(console.error);
