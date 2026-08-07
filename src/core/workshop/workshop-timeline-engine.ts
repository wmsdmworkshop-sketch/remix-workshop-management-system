import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class WorkshopTimelineEngine {
  public static async appendTimeline(
    referenceId: string,
    eventType: string,
    description: string,
    performedBy: string = "SYSTEM"
  ): Promise<void> {
    
    await db.execute(
      "INSERT INTO tbl_workshop_timeline (timeline_id, reference_id, event_type, description, performed_by) VALUES (?, ?, ?, ?, ?)",
      [`TL-${randomUUID().substring(0,8)}`, referenceId, eventType, description, performedBy]
    );
  }
}
