/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Scheduler Store
 * Bounded Context: Core System / Scheduler Platform
 * Description: Manages DB serialization of scheduled jobs and distributed locks.
 * =============================================================================
 */

import { pool as db } from "../../db/index";

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "PAUSED" | "DEAD_LETTER";

export interface ScheduledJobRecord {
  jobId: string;
  name: string;
  type: string; // "CRON" | "ONE_TIME" | "RECURRING" | "FIXED_RATE"
  cronExpression?: string;
  intervalMs?: number;
  status: JobStatus;
  nextExecutionTime: string;
  lastExecutionTime?: string;
  retryCount: number;
  maxRetries: number;
  lockedBy?: string;
  lockedUntil?: string;
  payload: Record<string, any>;
  correlationId: string;
}

export interface WorkerLeaseRecord {
  workerId: string;
  heartbeatTime: string;
  isLeader: boolean;
}

export class SchedulerStore {
  /**
   * Saves or updates a scheduled job.
   */
  public static async saveJob(job: ScheduledJobRecord): Promise<void> {
    const serialized = JSON.stringify(job);
    const queryPattern = `%"jobId":"${job.jobId}"%`;

    const [rows] = await db.execute(
      "SELECT notification_id FROM tbl_notifications WHERE notification_type = 'WOS_SCHEDULER_JOB' AND action_url LIKE ? LIMIT 1",
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
          "WOS_SCHEDULER_JOB",
          `Scheduled Job ${job.jobId} - ${job.name}`,
          "LOW",
          1,
          serialized,
        ]
      );
    }
  }

  public static async getJob(jobId: string): Promise<ScheduledJobRecord | null> {
    const queryPattern = `%"jobId":"${jobId}"%`;
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_SCHEDULER_JOB' AND action_url LIKE ? LIMIT 1",
      [queryPattern]
    ) as any[];

    if (!rows || rows.length === 0) return null;
    return JSON.parse(rows[0].action_url) as ScheduledJobRecord;
  }

  public static async getRunnableJobs(): Promise<ScheduledJobRecord[]> {
    const now = new Date().toISOString();
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_SCHEDULER_JOB'"
    ) as any[];

    const list: ScheduledJobRecord[] = [];
    for (const r of rows) {
      try {
        const job = JSON.parse(r.action_url) as ScheduledJobRecord;
        if (
          (job.status === "PENDING" || job.status === "FAILED") &&
          new Date(job.nextExecutionTime).getTime() <= Date.now()
        ) {
          list.push(job);
        }
      } catch (err) {
        // skip corrupt
      }
    }
    return list;
  }

  public static async getAllJobs(): Promise<ScheduledJobRecord[]> {
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_SCHEDULER_JOB'"
    ) as any[];

    const list: ScheduledJobRecord[] = [];
    for (const r of rows) {
      try {
        list.push(JSON.parse(r.action_url) as ScheduledJobRecord);
      } catch (err) {
        // skip corrupt
      }
    }
    return list;
  }

  /**
   * Saves or updates a worker node's lease.
   */
  public static async saveLease(lease: WorkerLeaseRecord): Promise<void> {
    const serialized = JSON.stringify(lease);
    const queryPattern = `%"workerId":"${lease.workerId}"%`;

    const [rows] = await db.execute(
      "SELECT notification_id FROM tbl_notifications WHERE notification_type = 'WOS_SCHEDULER_LEASE' AND action_url LIKE ? LIMIT 1",
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
          "WOS_SCHEDULER_LEASE",
          `Worker Lease - ${lease.workerId}`,
          "LOW",
          1,
          serialized,
        ]
      );
    }
  }

  public static async getLeases(): Promise<WorkerLeaseRecord[]> {
    const [rows] = await db.execute(
      "SELECT action_url FROM tbl_notifications WHERE notification_type = 'WOS_SCHEDULER_LEASE'"
    ) as any[];

    const list: WorkerLeaseRecord[] = [];
    for (const r of rows) {
      try {
        list.push(JSON.parse(r.action_url) as WorkerLeaseRecord);
      } catch (err) {
        // skip corrupt
      }
    }
    return list;
  }
}
