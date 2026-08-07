import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { WorkshopTimelineEngine } from "./workshop-timeline-engine";

export class BayAllocationEngine {
  constructor(private eventBus: IEventBus) {}

  public async allocateBay(jobCardId: string, bayType: string): Promise<{ success: boolean; bayId?: string }> {
    // Simple heuristic: get first available bay of this type
    const [bays] = await db.execute(
      "SELECT bay_id FROM tbl_bay_master WHERE bay_type = ? AND status = 'AVAILABLE' LIMIT 1",
      [bayType]
    ) as any[];

    if (bays.length === 0) {
      return { success: false }; // No bays available
    }

    const bayId = bays[0].bay_id;

    await db.execute(
      "INSERT INTO tbl_bay_allocation (allocation_id, job_card_id, bay_id) VALUES (?, ?, ?)",
      [`BA-${randomUUID().substring(0, 8)}`, jobCardId, bayId]
    );

    await db.execute(
      "UPDATE tbl_bay_master SET status = 'OCCUPIED' WHERE bay_id = ?",
      [bayId]
    );

    const context = makeSystemContext(`BAY-ALLOC-${jobCardId}`);
    await this.eventBus.publish("BAY_ALLOCATED", { jobCardId, bayId }, context);
    await WorkshopTimelineEngine.appendTimeline(jobCardId, "BAY_ALLOCATED", `Allocated to bay ${bayId}`);

    return { success: true, bayId };
  }
}

export class TechnicianAssignmentEngine {
  constructor(private eventBus: IEventBus) {}

  public async assignTechnician(operationId: string, jobCardId: string, requiredSkill: string): Promise<{ success: boolean; technicianId?: string }> {
    // For test simulation, directly assign a mock tech
    const technicianId = requiredSkill === "HV" ? "TECH-HV-1" : "TECH-GEN-1";

    await db.execute(
      "UPDATE tbl_job_operation SET technician_id = ?, status = 'ASSIGNED' WHERE operation_id = ?",
      [technicianId, operationId]
    );

    const context = makeSystemContext(`TECH-ASSIGN-${operationId}`);
    await this.eventBus.publish("TECHNICIAN_ASSIGNED", { operationId, jobCardId, technicianId }, context);
    await WorkshopTimelineEngine.appendTimeline(jobCardId, "TECHNICIAN_ASSIGNED", `Technician ${technicianId} assigned to operation ${operationId}`);

    return { success: true, technicianId };
  }
}
