/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Scheduler Polling Worker
 * Bounded Context: Core System / Scheduler Platform
 * Description: Scans runnable jobs, claims execution locks, updates status,
 *              and manages retries and dead letters.
 * =============================================================================
 */

import { SchedulerStore, ScheduledJobRecord } from "./scheduler-store";
import { SchedulerLock } from "./scheduler-lock";
import { SchedulerPolicy } from "./scheduler-policy";
import { IEventBus } from "../event-bus";

export class SchedulerWorker {
  private processing = false;

  constructor(
    public readonly workerId: string,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Main scanning cycle. Verifies leadership before claiming locks to prevent double runs.
   */
  public async executePass(mockExecutor?: (job: ScheduledJobRecord) => Promise<boolean>): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      // 1. Leader Election check
      const isLeader = await SchedulerLock.electLeader(this.workerId);
      if (!isLeader) {
        return; // Only leader worker executes jobs
      }

      // 2. Poll runnable jobs
      const jobs = await SchedulerStore.getRunnableJobs();

      for (const job of jobs) {
        // 3. Acquire Distributed Lock (Lease lock for 30s)
        const lockAcquired = await SchedulerLock.tryAcquireLock(
          `LOCK-${job.jobId}`,
          this.workerId,
          30000
        );

        if (!lockAcquired) continue;

        // 4. Update status to RUNNING
        job.status = "RUNNING";
        job.lastExecutionTime = new Date().toISOString();
        await SchedulerStore.saveJob(job);

        // 5. Execute job
        try {
          let ok = true;
          if (mockExecutor) {
            ok = await mockExecutor(job);
          }

          if (ok) {
            job.status = "COMPLETED";
            await SchedulerStore.saveJob(job);
            await this.eventBus.publish(
              "SCHEDULER_JOB_COMPLETED",
              { jobId: job.jobId, name: job.name },
              job.correlationId
            );
          } else {
            await this.handleFailure(job, "Executor returned false");
          }
        } catch (err: any) {
          await this.handleFailure(job, err.message || "Execution error");
        } finally {
          // Release lock post execution
          await SchedulerLock.releaseLock(`LOCK-${job.jobId}`, this.workerId);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async handleFailure(job: ScheduledJobRecord, errorMsg: string): Promise<void> {
    job.retryCount += 1;
    if (job.retryCount >= job.maxRetries) {
      job.status = "DEAD_LETTER";
      await SchedulerStore.saveJob(job);
      await this.eventBus.publish(
        "SCHEDULER_JOB_DEAD_LETTER",
        { jobId: job.jobId, name: job.name, reason: errorMsg },
        job.correlationId
      );
    } else {
      job.status = "FAILED";
      const backoffMs = SchedulerPolicy.calculateBackoffMs(job.retryCount);
      job.nextExecutionTime = new Date(Date.now() + backoffMs).toISOString();
      await SchedulerStore.saveJob(job);
    }
  }
}
