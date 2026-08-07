import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { AllocatedResource, DispatchStatus } from "./breakdown-types";

export class DispatchEngine {
  constructor(private eventBus: IEventBus) {}

  public async createDispatch(
    caseId: string,
    resource: AllocatedResource
  ): Promise<{ success: boolean; dispatchId?: string }> {
    const dispatchId = `DISP-${randomUUID().substring(0, 8).toUpperCase()}`;

    // 1. Create Dispatch
    await db.execute(
      "INSERT INTO tbl_breakdown_dispatch (dispatch_id, case_id, workshop_id, qrt_team_id, technician_id, mobile_van_id, dispatch_status, dispatch_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [dispatchId, caseId, resource.workshop_id, resource.qrt_team_id || null, resource.technician_id, resource.mobile_van_id || null, "PENDING", new Date()]
    );

    // 2. Publish Event
    const context = makeSystemContext(`DISP-CREATE-${dispatchId}`);
    await this.eventBus.publish("BREAKDOWN_ASSIGNED", { 
      dispatchId, caseId, technicianId: resource.technician_id 
    }, context);

    return { success: true, dispatchId };
  }

  public async updateDispatchStatus(
    dispatchId: string,
    status: DispatchStatus
  ): Promise<void> {
    await db.execute(
      "UPDATE tbl_breakdown_dispatch SET dispatch_status = ? WHERE dispatch_id = ?",
      [status, dispatchId]
    );

    const context = makeSystemContext(`DISP-STAT-${dispatchId}`);
    let eventName = "BREAKDOWN_DISPATCH_UPDATED";
    
    if (status === "EN_ROUTE") eventName = "TECHNICIAN_EN_ROUTE";
    if (status === "ARRIVED") eventName = "TECHNICIAN_ARRIVED";

    await this.eventBus.publish(eventName, { dispatchId, status }, context);
  }

  public async reassignTechnician(
    dispatchId: string,
    newTechnicianId: string,
    reason: string
  ): Promise<void> {
    
    // 1. Get current
    const [dispatches] = await db.execute("SELECT technician_id FROM tbl_breakdown_dispatch WHERE dispatch_id = ?", [dispatchId]) as any[];
    const prevTech = dispatches[0]?.technician_id;

    // 2. Add history
    await db.execute(
      "INSERT INTO tbl_breakdown_dispatch_history (history_id, dispatch_id, previous_technician_id, new_technician_id, reason) VALUES (?, ?, ?, ?, ?)",
      [`DH-${randomUUID().substring(0,8)}`, dispatchId, prevTech, newTechnicianId, reason]
    );

    // 3. Update dispatch
    await db.execute(
      "UPDATE tbl_breakdown_dispatch SET technician_id = ?, dispatch_status = 'REASSIGNED' WHERE dispatch_id = ?",
      [newTechnicianId, dispatchId]
    );

    const context = makeSystemContext(`DISP-REASSIGN-${dispatchId}`);
    await this.eventBus.publish("BREAKDOWN_REASSIGNED", { dispatchId, newTechnicianId, reason }, context);
  }
}
