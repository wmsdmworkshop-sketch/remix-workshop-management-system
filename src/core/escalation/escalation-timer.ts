/**
 * =============================================================================
 * WOS Core Architecture: Persistent Escalation Timer
 * Bounded Context: Core System / SLA Escalations
 * Description: Manages and persists SLA timers inside the database to survive
 *              server crashes and restarts without memory leaks.
 * =============================================================================
 */

import { pool as db } from "../../db/index";

export interface TimerRecord {
  jobId: number;
  type: string;
  status: "RUNNING" | "PAUSED" | "STOPPED" | "SUSPENDED";
  startTime: string;
  lastPausedTime?: string;
  accumulatedMs: number;
  limitMinutes: number;
}

export class EscalationTimer {
  /**
   * Starts a new persistent SLA timer for a Job Card.
   */
  public static async start(
    jobId: number,
    type: string,
    limitMinutes: number
  ): Promise<void> {
    const timer: TimerRecord = {
      jobId,
      type,
      status: "RUNNING",
      startTime: new Date().toISOString(),
      accumulatedMs: 0,
      limitMinutes,
    };

    await this.saveTimer(timer);
  }

  public static async pause(jobId: number, type: string): Promise<void> {
    const timer = await this.getTimer(jobId, type);
    if (timer && timer.status === "RUNNING") {
      timer.status = "PAUSED";
      timer.lastPausedTime = new Date().toISOString();
      await this.saveTimer(timer);
    }
  }

  public static async resume(jobId: number, type: string): Promise<void> {
    const timer = await this.getTimer(jobId, type);
    if (timer && timer.status === "PAUSED" && timer.lastPausedTime) {
      const pausedDuration = Date.now() - new Date(timer.lastPausedTime).getTime();
      timer.status = "RUNNING";
      timer.accumulatedMs += pausedDuration;
      timer.lastPausedTime = undefined;
      await this.saveTimer(timer);
    }
  }

  public static async stop(jobId: number, type: string): Promise<void> {
    const timer = await this.getTimer(jobId, type);
    if (timer) {
      timer.status = "STOPPED";
      await this.saveTimer(timer);
    }
  }

  public static async reset(jobId: number, type: string, limitMinutes?: number): Promise<void> {
    const timer = await this.getTimer(jobId, type);
    if (timer) {
      timer.status = "RUNNING";
      timer.startTime = new Date().toISOString();
      timer.lastPausedTime = undefined;
      timer.accumulatedMs = 0;
      if (limitMinutes !== undefined) {
        timer.limitMinutes = limitMinutes;
      }
      await this.saveTimer(timer);
    }
  }

  public static async suspend(jobId: number, type: string): Promise<void> {
    const timer = await this.getTimer(jobId, type);
    if (timer) {
      timer.status = "SUSPENDED";
      await this.saveTimer(timer);
    }
  }

  public static async restart(jobId: number, type: string, limitMinutes: number): Promise<void> {
    await this.stop(jobId, type);
    await this.start(jobId, type, limitMinutes);
  }

  /**
   * Retrieves all running timers from persistent database storage.
   */
  public static async getActiveTimers(): Promise<TimerRecord[]> {
    const queryPattern = '%"status":"RUNNING"%';
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_TIMER' AND action_url LIKE ?",
      [queryPattern]
    ) as any[];

    const timers: TimerRecord[] = [];
    for (const r of rows) {
      try {
        timers.push(JSON.parse(r.action_url) as TimerRecord);
      } catch (err) {
        // Skip corrupt rows
      }
    }
    return timers;
  }

  /**
   * Fetches a specific persistent timer record.
   */
  public static async getTimer(jobId: number, type: string): Promise<TimerRecord | null> {
    const queryPattern = `%"jobId":${jobId},"type":"${type}"%`;
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_TIMER' AND action_url LIKE ? LIMIT 1",
      [queryPattern]
    ) as any[];

    if (!rows || rows.length === 0) return null;

    try {
      return JSON.parse(rows[0].action_url) as TimerRecord;
    } catch (e) {
      return null;
    }
  }

  private static async saveTimer(timer: TimerRecord): Promise<void> {
    const serialized = JSON.stringify(timer);
    
    // Check if record already exists to perform update vs insert
    const queryPattern = `%"jobId":${timer.jobId},"type":"${timer.type}"%`;
    const [rows] = await db.execute(
      "SELECT notification_id FROM tbl_notifications WHERE notification_type = 'WOS_TIMER' AND action_url LIKE ? LIMIT 1",
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
          "WOS_TIMER",
          `Timer for Job ${timer.jobId} type ${timer.type}`,
          "LOW",
          timer.jobId,
          serialized,
        ]
      );
    }
  }
}
