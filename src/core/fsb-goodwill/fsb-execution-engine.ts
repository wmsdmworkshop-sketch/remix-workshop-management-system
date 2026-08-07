import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { FsbEligibilityEngine } from "./fsb-eligibility-engine";

export class FsbExecutionEngine {
  constructor(private eventBus: IEventBus) {}

  public async startExecution(
    campaignId: string,
    vin: string,
    jobId: number,
    technicianId: string
  ): Promise<{ success: boolean; executionId?: string; error?: string }> {
    
    // 1. Verify Eligibility
    const eligibility = await FsbEligibilityEngine.evaluateEligibility(campaignId, vin);
    if (eligibility.status !== "ELIGIBLE") {
      return { success: false, error: `Vehicle is ${eligibility.status}: ${eligibility.reason}` };
    }

    // 2. Determine Attempt Number (Append-Only Logic)
    const [existingExecs] = await db.execute(
      "SELECT COUNT(*) as attempts FROM tbl_fsb_execution WHERE campaign_id = ? AND vin = ?",
      [campaignId, vin]
    ) as any[];
    const attemptNumber = (existingExecs[0]?.attempts || 0) + 1;

    // 3. Create Execution Record
    const executionId = `EXEC-${randomUUID().substring(0, 8).toUpperCase()}`;
    await db.execute(
      "INSERT INTO tbl_fsb_execution (execution_id, campaign_id, job_id, vin, technician_id, attempt_number, start_time) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [executionId, campaignId, jobId, vin, technicianId, attemptNumber, new Date()]
    );

    // 4. Publish Event
    const context = makeSystemContext(`FSB-EXEC-${executionId}`);
    await this.eventBus.publish("FSB_EXECUTION_STARTED", { campaignId, executionId, vin, attemptNumber }, context);

    return { success: true, executionId };
  }

  public async completeExecution(
    executionId: string,
    partsUsed: number,
    labourUsed: number,
    notes?: string
  ): Promise<void> {
    
    await db.execute(
      "UPDATE tbl_fsb_execution SET execution_status = 'COMPLETED', completion_time = ?, parts_used = ?, labour_used = ?, notes = ? WHERE execution_id = ?",
      [new Date(), partsUsed, labourUsed, notes || "", executionId]
    );

    const context = makeSystemContext(`FSB-EXEC-COMP-${executionId}`);
    await this.eventBus.publish("FSB_EXECUTION_COMPLETED", { executionId, status: "COMPLETED" }, context);
  }
}
