/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Timer Store
 * Bounded Context: Core System / Timer Platform
 * Description: Handles DB persistence of enterprise timer envelopes in
 *              tbl_notifications without changing the physical schema.
 * =============================================================================
 */

import { pool as db } from "../../db/index";

export type TimerStatus = "RUNNING" | "PAUSED" | "STOPPED" | "SUSPENDED" | "EXPIRED" | "CANCELLED";

export type TimerType =
  | "WORKFLOW"
  | "SLA"
  | "REMINDER"
  | "NOTIFICATION"
  | "APPROVAL"
  | "QUEUE"
  | "QC"
  | "PARTS"
  | "DELIVERY"
  | "FOLLOW_UP";

export interface TimerPolicy {
  businessHoursOnly: boolean;
  pausedOvernight: boolean;
  pausedOnHoliday: boolean;
}

export interface EnterpriseTimerRecord {
  timerId: string;
  jobId: number;
  timerType: TimerType;
  status: TimerStatus;
  startTime: string;
  lastPausedTime?: string;
  accumulatedMs: number;
  limitMinutes: number;
  policy: TimerPolicy;
  workshopId: number;
  branchId: number;
  correlationId: string;
  validationRunId?: string;
}

export class TimerStore {
  /**
   * Persists or updates a timer record in the database.
   */
  public static async save(timer: EnterpriseTimerRecord): Promise<void> {
    const serialized = JSON.stringify(timer);
    
    // Check if record exists
    const queryPattern = `%"timerId":"${timer.timerId}"%`;
    const [rows] = await db.execute(
      "SELECT notification_id FROM tbl_notifications WHERE notification_type = 'WOS_ENTERPRISE_TIMER' AND action_url LIKE ? LIMIT 1",
      [queryPattern]
    ) as any[];

    if (rows && rows.length > 0) {
      await db.execute(
        "UPDATE tbl_notifications SET action_url = ? WHERE notification_id = ?",
        [serialized, rows[0].notification_id]
      );
    } else {
      await db.execute(
        `INSERT INTO tbl_notifications 
         (user_id, notification_type, message, priority, related_job_id, action_url) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          1,
          "WOS_ENTERPRISE_TIMER",
          `Timer ${timer.timerId} type ${timer.timerType} for Job ${timer.jobId}`,
          "LOW",
          timer.jobId,
          serialized,
        ]
      );
    }
  }

  /**
   * Retrieves a specific timer record from DB.
   */
  public static async get(timerId: string): Promise<EnterpriseTimerRecord | null> {
    const queryPattern = `%"timerId":"${timerId}"%`;
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_ENTERPRISE_TIMER' AND action_url LIKE ? LIMIT 1",
      [queryPattern]
    ) as any[];

    if (!rows || rows.length === 0) return null;

    try {
      return JSON.parse(rows[0].action_url) as EnterpriseTimerRecord;
    } catch (e) {
      return null;
    }
  }

  /**
   * Retrieves all timers currently in RUNNING state.
   */
  public static async getActiveTimers(): Promise<EnterpriseTimerRecord[]> {
    const queryPattern = '%"status":"RUNNING"%';
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_ENTERPRISE_TIMER' AND action_url LIKE ?",
      [queryPattern]
    ) as any[];

    const timers: EnterpriseTimerRecord[] = [];
    for (const r of rows) {
      try {
        timers.push(JSON.parse(r.action_url) as EnterpriseTimerRecord);
      } catch (e) {
        // skip corrupt
      }
    }
    return timers;
  }

  /**
   * Retrieves all timers registered in the system.
   */
  public static async getAllTimers(): Promise<EnterpriseTimerRecord[]> {
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_ENTERPRISE_TIMER'"
    ) as any[];

    const timers: EnterpriseTimerRecord[] = [];
    for (const r of rows) {
      try {
        timers.push(JSON.parse(r.action_url) as EnterpriseTimerRecord);
      } catch (e) {
        // skip corrupt
      }
    }
    return timers;
  }
}
