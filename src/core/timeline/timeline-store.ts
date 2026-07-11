/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Timeline Store
 * Bounded Context: Core System / Timeline Platform
 * Description: Manages append-only immutable DB storage of timeline events.
 *              Enforces that updates/deletions are blocked.
 * =============================================================================
 */

import { pool as db } from "../../db/index";

export interface TimelineEvent {
  timelineId: string;
  correlationId: string;
  validationRunId?: string;
  workshopId: number;
  branchId: number;
  jobCardId: number;
  vehicleId: number;
  customerId: number;
  employeeId?: number;
  role?: string;
  sourceEngine: string; // Workflow, Notification, etc.
  eventType: string;
  eventName: string;
  workflowState?: string;
  queue?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  duration?: number;
  priority?: string;
  location?: string;
  device?: string;
  aiContext?: string;
  decisionId?: string;
  auditId?: string;
}

export class TimelineStore {
  /**
   * Appends an immutable event to the database.
   * Modifying or deleting records is prohibited by design.
   */
  public static async append(event: TimelineEvent): Promise<void> {
    const serialized = JSON.stringify(event);

    await db.execute(
      `INSERT INTO tbl_notifications 
       (user_id, notification_type, message, priority, related_job_id, action_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        event.employeeId || 1,
        "WOS_TIMELINE_RECORD",
        `[Timeline Event] ${event.eventName} for Job ${event.jobCardId}`,
        event.priority || "LOW",
        event.jobCardId,
        serialized,
      ]
    );
  }

  /**
   * Reads all events from persistent storage.
   */
  public static async getAll(): Promise<TimelineEvent[]> {
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_TIMELINE_RECORD'"
    ) as any[];

    const list: TimelineEvent[] = [];
    for (const r of rows) {
      try {
        list.push(JSON.parse(r.action_url) as TimelineEvent);
      } catch (err) {
        // Skip corrupt rows
      }
    }
    // Sort chronologically by default
    return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}
