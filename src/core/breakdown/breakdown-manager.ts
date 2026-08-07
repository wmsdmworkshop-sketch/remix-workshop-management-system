import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { BreakdownPriority, BreakdownSeverity, BreakdownSource, BreakdownWorkflowState, GeoLocation } from "./breakdown-types";

export class BreakdownManager {
  constructor(private eventBus: IEventBus) {}

  public async createCase(
    vin: string,
    source: BreakdownSource,
    location: GeoLocation,
    complaint: string,
    severity: BreakdownSeverity,
    priority: BreakdownPriority
  ): Promise<{ success: boolean; caseId?: string }> {
    const caseId = `BD-${randomUUID().substring(0, 8).toUpperCase()}`;

    // 1. Create Case
    await db.execute(
      "INSERT INTO tbl_breakdown_case (case_id, vin, source, latitude, longitude, complaint, severity, priority, workflow_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [caseId, vin, source, location.latitude, location.longitude, complaint, severity, priority, "REPORTED"]
    );

    // 2. Add Activity
    await this.logActivity(caseId, "CREATED", "Breakdown case reported via " + source);

    // 3. Publish Event
    const context = makeSystemContext(`BD-CREATE-${caseId}`);
    await this.eventBus.publish("BREAKDOWN_REPORTED", { caseId, vin, source, priority }, context);

    return { success: true, caseId };
  }

  public async updateState(
    caseId: string,
    newState: BreakdownWorkflowState
  ): Promise<void> {
    await db.execute(
      "UPDATE tbl_breakdown_case SET workflow_state = ? WHERE case_id = ?",
      [newState, caseId]
    );

    await this.logActivity(caseId, "STATE_CHANGE", `State updated to ${newState}`);

    const context = makeSystemContext(`BD-STATE-${caseId}`);
    
    // Publish generic or specific events based on state
    if (newState === "VALIDATED") {
      await this.eventBus.publish("BREAKDOWN_VALIDATED", { caseId }, context);
    } else if (newState === "CLOSED") {
      await this.eventBus.publish("BREAKDOWN_CLOSED", { caseId }, context);
    } else if (newState === "DIAGNOSIS") {
      await this.eventBus.publish("DIAGNOSIS_STARTED", { caseId }, context);
    }
  }

  private async logActivity(caseId: string, activityType: string, description: string) {
    await db.execute(
      "INSERT INTO tbl_breakdown_activity (activity_id, case_id, activity_type, description) VALUES (?, ?, ?, ?)",
      [`ACT-${randomUUID().substring(0,8)}`, caseId, activityType, description]
    );
  }
}
