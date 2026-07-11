/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Scheduler Locks & Election
 * Bounded Context: Core System / Scheduler Platform
 * Description: Coordinates distributed locks and leader election using atomic
 *              database constraints.
 * =============================================================================
 */

import { pool as db } from "../../db/index";
import { SchedulerStore, WorkerLeaseRecord } from "./scheduler-store";

export class SchedulerLock {
  /**
   * Attempts to acquire a distributed lock.
   */
  public static async tryAcquireLock(
    lockKey: string,
    owner: string,
    leaseMs: number
  ): Promise<boolean> {
    const queryPattern = `%"lockKey":"${lockKey}"%`;
    const now = Date.now();
    const until = new Date(now + leaseMs).toISOString();

    const [rows] = await db.execute(
      "SELECT notification_id, action_url FROM tbl_notifications WHERE notification_type = 'WOS_SCHEDULER_LOCK' AND action_url LIKE ? LIMIT 1",
      [queryPattern]
    ) as any[];

    if (rows && rows.length > 0) {
      const lock = JSON.parse(rows[0].action_url);
      if (new Date(lock.until).getTime() <= now || lock.owner === owner) {
        // Lock expired or owned by claimant -> acquire
        lock.owner = owner;
        lock.until = until;
        await db.execute(
          "UPDATE tbl_notifications SET action_url = ? WHERE notification_id = ?",
          [JSON.stringify(lock), rows[0].notification_id]
        );
        return true;
      }
      return false; // locked by someone else
    } else {
      // First time lock creation
      const lock = { lockKey, owner, until };
      await db.execute(
        `INSERT INTO tbl_notifications 
         (user_id, notification_type, message, priority, related_job_id, action_url) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [1, "WOS_SCHEDULER_LOCK", `Lock ${lockKey}`, "LOW", 1, JSON.stringify(lock)]
      );
      return true;
    }
  }

  public static async releaseLock(lockKey: string, owner: string): Promise<void> {
    const queryPattern = `%"lockKey":"${lockKey}"%`;
    const [rows] = await db.execute(
      "SELECT notification_id, action_url FROM tbl_notifications WHERE notification_type = 'WOS_SCHEDULER_LOCK' AND action_url LIKE ? LIMIT 1",
      [queryPattern]
    ) as any[];

    if (rows && rows.length > 0) {
      const lock = JSON.parse(rows[0].action_url);
      if (lock.owner === owner) {
        lock.until = new Date(0).toISOString(); // set expired
        await db.execute(
          "UPDATE tbl_notifications SET action_url = ? WHERE notification_id = ?",
          [JSON.stringify(lock), rows[0].notification_id]
        );
      }
    }
  }

  /**
   * Conducts worker leader election. If leader heartbeat is dead, conducts failover.
   */
  public static async electLeader(workerId: string): Promise<boolean> {
    const leases = await SchedulerStore.getLeases();
    const now = Date.now();

    // Check if there is an active leader
    const activeLeader = leases.find(
      (l) => l.isLeader && now - new Date(l.heartbeatTime).getTime() < 5000 // 5s timeout
    );

    if (activeLeader) {
      return activeLeader.workerId === workerId;
    }

    // No active leader -> elect claimant
    for (const l of leases) {
      if (l.workerId === workerId) {
        l.isLeader = true;
        l.heartbeatTime = new Date().toISOString();
        await SchedulerStore.saveLease(l);
      } else if (l.isLeader) {
        l.isLeader = false; // demote dead leader
        await SchedulerStore.saveLease(l);
      }
    }

    // In case no lease existed yet for this worker
    if (!leases.some((l) => l.workerId === workerId)) {
      const newLease: WorkerLeaseRecord = {
        workerId,
        heartbeatTime: new Date().toISOString(),
        isLeader: true,
      };
      await SchedulerStore.saveLease(newLease);
    }

    return true;
  }
}
