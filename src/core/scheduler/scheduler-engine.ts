/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Scheduler Engine
 * Bounded Context: Core System / Scheduler Platform
 * Description: Exposes scheduling, pausing, resuming, and restarting controls.
 * =============================================================================
 */

import { SchedulerStore, ScheduledJobRecord } from "./scheduler-store";
import { SchedulerCalendar } from "./scheduler-calendar";
import { IEventBus } from "../event-bus";

export class SchedulerEngine {
  constructor(private readonly eventBus: IEventBus) {}

  /**
   * Enqueues a background job into the persistent database.
   */
  public async scheduleJob(
    jobId: string,
    name: string,
    type: string,
    params: { cronExpression?: string; intervalMs?: number },
    payload: Record<string, any>,
    correlationId: string
  ): Promise<void> {
    const nextTime = SchedulerCalendar.getNextTime(type, params);

    const job: ScheduledJobRecord = {
      jobId,
      name,
      type,
      cronExpression: params.cronExpression,
      intervalMs: params.intervalMs,
      status: "PENDING",
      nextExecutionTime: nextTime,
      retryCount: 0,
      maxRetries: 3,
      payload,
      correlationId,
    };

    await SchedulerStore.saveJob(job);

    await this.eventBus.publish(
      "SCHEDULER_JOB_SCHEDULED",
      { jobId, name, type, nextExecutionTime: nextTime, correlationId },
      correlationId
    );
  }

  public async pauseJob(jobId: string, correlationId: string): Promise<void> {
    const job = await SchedulerStore.getJob(jobId);
    if (job && job.status !== "PAUSED") {
      job.status = "PAUSED";
      await SchedulerStore.saveJob(job);
      await this.eventBus.publish("SCHEDULER_JOB_PAUSED", { jobId, correlationId }, correlationId);
    }
  }

  public async resumeJob(jobId: string, correlationId: string): Promise<void> {
    const job = await SchedulerStore.getJob(jobId);
    if (job && job.status === "PAUSED") {
      job.status = "PENDING";
      job.nextExecutionTime = new Date().toISOString(); // run immediately on resume
      await SchedulerStore.saveJob(job);
      await this.eventBus.publish("SCHEDULER_JOB_RESUMED", { jobId, correlationId }, correlationId);
    }
  }

  public async cancelJob(jobId: string, correlationId: string): Promise<void> {
    const job = await SchedulerStore.getJob(jobId);
    if (job && job.status !== "COMPLETED") {
      job.status = "COMPLETED"; // mark as completed to take out of scan
      await SchedulerStore.saveJob(job);
      await this.eventBus.publish("SCHEDULER_JOB_CANCELLED", { jobId, correlationId }, correlationId);
    }
  }

  public async restartJob(jobId: string, correlationId: string): Promise<void> {
    const job = await SchedulerStore.getJob(jobId);
    if (job) {
      job.status = "PENDING";
      job.retryCount = 0;
      job.nextExecutionTime = new Date().toISOString();
      await SchedulerStore.saveJob(job);
      await this.eventBus.publish("SCHEDULER_JOB_RESTARTED", { jobId, correlationId }, correlationId);
    }
  }
}
