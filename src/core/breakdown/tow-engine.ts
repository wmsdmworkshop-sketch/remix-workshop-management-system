import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { TowRequest } from "./breakdown-types";

export class TowManagementEngine {
  constructor(private eventBus: IEventBus) {}

  public async requestTow(request: TowRequest): Promise<{ success: boolean; towId?: string }> {
    const towId = `TOW-${randomUUID().substring(0, 8).toUpperCase()}`;

    // 1. Create Tow Record
    await db.execute(
      "INSERT INTO tbl_breakdown_tow (tow_id, case_id, destination_workshop_id, distance_km, tow_charges, status) VALUES (?, ?, ?, ?, ?, ?)",
      [towId, request.case_id, request.destination_workshop_id, request.distance_km, request.tow_charges, "REQUESTED"]
    );

    // 2. Publish Event
    const context = makeSystemContext(`TOW-REQ-${towId}`);
    await this.eventBus.publish("TOW_REQUESTED", { 
      towId, 
      caseId: request.case_id, 
      destinationWorkshopId: request.destination_workshop_id 
    }, context);

    return { success: true, towId };
  }

  public async assignVendor(towId: string, vendorId: string, vehicleNumber: string): Promise<void> {
    await db.execute(
      "UPDATE tbl_breakdown_tow SET vendor_id = ?, tow_vehicle_number = ?, status = 'VENDOR_ASSIGNED' WHERE tow_id = ?",
      [vendorId, vehicleNumber, towId]
    );
  }

  public async completeTow(towId: string): Promise<void> {
    await db.execute(
      "UPDATE tbl_breakdown_tow SET status = 'COMPLETED', drop_time = ? WHERE tow_id = ?",
      [new Date(), towId]
    );

    const [tows] = await db.execute("SELECT case_id FROM tbl_breakdown_tow WHERE tow_id = ?", [towId]) as any[];
    if (tows.length > 0) {
        const caseId = tows[0].case_id;
        const context = makeSystemContext(`TOW-COMP-${towId}`);
        await this.eventBus.publish("WORKSHOP_REACHED", { towId, caseId }, context);
    }
  }
}
