import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { JobCardWorkflowState, OperationalState, ServiceType } from "./workshop-types";
import { WorkshopTimelineEngine } from "./workshop-timeline-engine";

export class JobCardEngine {
  constructor(private eventBus: IEventBus) {}

  public async createJobCard(
    vin: string,
    serviceType: ServiceType,
    gateEntryId?: string,
    appointmentId?: string,
    breakdownId?: string
  ): Promise<{ success: boolean; jobCardId?: string }> {
    const jobCardId = `JC-${randomUUID().substring(0, 8).toUpperCase()}`;

    await db.execute(
      "INSERT INTO tbl_job_card (job_card_id, gate_entry_id, breakdown_id, appointment_id, service_type, workflow_state, operational_state) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [jobCardId, gateEntryId || null, breakdownId || null, appointmentId || null, serviceType, "JOB_CARD_CREATED", "WAITING_FOR_BAY"]
    );

    const context = makeSystemContext(`JC-CREATE-${jobCardId}`);
    await this.eventBus.publish("JOB_CARD_CREATED", { jobCardId, vin, serviceType }, context);
    await WorkshopTimelineEngine.appendTimeline(jobCardId, "JOB_CARD_CREATED", `Job card created for VIN: ${vin}`);

    return { success: true, jobCardId };
  }

  public async updateOperationalState(
    jobCardId: string,
    newState: OperationalState,
    userId: string
  ): Promise<void> {
    await db.execute(
      "UPDATE tbl_job_card SET operational_state = ? WHERE job_card_id = ?",
      [newState, jobCardId]
    );

    const context = makeSystemContext(`JC-OP-STATE-${jobCardId}`);
    await this.eventBus.publish("OPERATIONAL_STATE_CHANGED", { jobCardId, newState }, context);
    await WorkshopTimelineEngine.appendTimeline(jobCardId, "OPERATIONAL_STATE_CHANGED", `Operational State changed to ${newState}`, userId);
  }

  public async reviseJobCard(
    jobCardId: string,
    changesSummary: string,
    userId: string
  ): Promise<void> {
    const [revs] = await db.execute("SELECT MAX(version) as max_v FROM tbl_job_card_revision WHERE job_card_id = ?", [jobCardId]) as any[];
    const nextVersion = (revs[0]?.max_v || 0) + 1;

    await db.execute(
      "INSERT INTO tbl_job_card_revision (revision_id, job_card_id, version, changes_summary, revised_by) VALUES (?, ?, ?, ?, ?)",
      [`JCR-${randomUUID().substring(0,8)}`, jobCardId, nextVersion, changesSummary, userId]
    );
    
    await WorkshopTimelineEngine.appendTimeline(jobCardId, "JOB_CARD_REVISED", `Job card revised (v${nextVersion}): ${changesSummary}`, userId);
  }
}
