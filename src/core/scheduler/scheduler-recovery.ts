/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Scheduler Recovery
 * Bounded Context: Core System / Scheduler Platform
 * Description: Scans outstanding jobs post-restart and resets orphan locks.
 * =============================================================================
 */

import { SchedulerStore } from "./scheduler-store";

export class SchedulerRecovery {
  /**
   * Resets locked status for jobs that were running on a dead worker node.
   */
  public async recoverOrphanedJobs(): Promise<number> {
    const all = await SchedulerStore.getAllJobs();
    let recoveredCount = 0;

    for (const job of all) {
      if (job.status === "RUNNING") {
        job.status = "PENDING";
        job.lockedBy = undefined;
        job.lockedUntil = undefined;
        await SchedulerStore.saveJob(job);
        recoveredCount++;
      }
    }

    return recoveredCount;
  }
}
