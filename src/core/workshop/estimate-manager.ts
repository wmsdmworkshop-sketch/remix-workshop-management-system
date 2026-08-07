import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { WorkshopTimelineEngine } from "./workshop-timeline-engine";

export class EstimateManager {
  constructor(private eventBus: IEventBus) {}

  public async createEstimate(
    jobCardId: string,
    totalLabour: number,
    totalParts: number
  ): Promise<{ success: boolean; estimateId?: string }> {
    const estimateId = `EST-${randomUUID().substring(0, 8).toUpperCase()}`;

    await db.execute(
      "INSERT INTO tbl_workshop_estimate (estimate_id, job_card_id, total_labour, total_parts, status, current_version) VALUES (?, ?, ?, ?, ?, ?)",
      [estimateId, jobCardId, totalLabour, totalParts, "DRAFT", 1]
    );

    const context = makeSystemContext(`EST-CREATE-${estimateId}`);
    await this.eventBus.publish("ESTIMATE_CREATED", { estimateId, jobCardId }, context);
    await WorkshopTimelineEngine.appendTimeline(jobCardId, "ESTIMATE_CREATED", `Estimate created for Job Card`);

    return { success: true, estimateId };
  }

  public async reviseEstimate(
    estimateId: string,
    newTotalLabour: number,
    newTotalParts: number,
    customerRemarks: string
  ): Promise<void> {
    const [ests] = await db.execute("SELECT current_version, job_card_id FROM tbl_workshop_estimate WHERE estimate_id = ?", [estimateId]) as any[];
    if (ests.length === 0) return;
    
    const nextVersion = ests[0].current_version + 1;
    const jobCardId = ests[0].job_card_id;
    const newTotalAmount = newTotalLabour + newTotalParts;

    await db.execute(
      "INSERT INTO tbl_workshop_estimate_revision (revision_id, estimate_id, version, total_amount, customer_remarks) VALUES (?, ?, ?, ?, ?)",
      [`EST-REV-${randomUUID().substring(0,8)}`, estimateId, nextVersion, newTotalAmount, customerRemarks]
    );

    await db.execute(
      "UPDATE tbl_workshop_estimate SET current_version = ?, total_labour = ?, total_parts = ? WHERE estimate_id = ?",
      [nextVersion, newTotalLabour, newTotalParts, estimateId]
    );

    const context = makeSystemContext(`EST-REVISE-${estimateId}`);
    await this.eventBus.publish("ESTIMATE_REVISED", { estimateId, version: nextVersion }, context);
    await WorkshopTimelineEngine.appendTimeline(jobCardId, "ESTIMATE_REVISED", `Estimate revised to v${nextVersion}`);
  }
}
