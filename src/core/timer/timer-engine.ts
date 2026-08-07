/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Timer Engine
 * Bounded Context: Core System / Timer Platform
 * Description: Implements timer state machine transitions.
 * =============================================================================
 */

import { TimerStore, EnterpriseTimerRecord, TimerType, TimerPolicy } from "./timer-store";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class TimerEngine {
  constructor(public readonly eventBus: IEventBus) {}

  public async start(
    timerId: string,
    jobId: number,
    timerType: TimerType,
    limitMinutes: number,
    policy: TimerPolicy,
    context: { workshopId: number; branchId: number },
    correlationId: string,
    validationRunId?: string
  ): Promise<void> {
    const timer: EnterpriseTimerRecord = {
      timerId,
      jobId,
      timerType,
      status: "RUNNING",
      startTime: new Date().toISOString(),
      accumulatedMs: 0,
      limitMinutes,
      policy,
      workshopId: context.workshopId,
      branchId: context.branchId,
      correlationId,
      validationRunId,
    };

    await TimerStore.save(timer);
    await this.eventBus.publish(
      "TIMER_STARTED",
      { timerId, jobId, timerType, limitMinutes, correlationId },
      makeSystemContext(correlationId),
      validationRunId
    );
  }

  public async pause(timerId: string, correlationId: string): Promise<void> {
    const timer = await TimerStore.get(timerId);
    if (timer && timer.status === "RUNNING") {
      timer.status = "PAUSED";
      timer.lastPausedTime = new Date().toISOString();
      await TimerStore.save(timer);

      await this.eventBus.publish(
        "TIMER_PAUSED",
        { timerId, jobId: timer.jobId, correlationId },
        makeSystemContext(correlationId),
        timer.validationRunId
      );
    }
  }

  public async resume(timerId: string, correlationId: string): Promise<void> {
    const timer = await TimerStore.get(timerId);
    if (timer && timer.status === "PAUSED" && timer.lastPausedTime) {
      const pausedDuration = Date.now() - new Date(timer.lastPausedTime).getTime();
      timer.status = "RUNNING";
      timer.accumulatedMs += pausedDuration;
      timer.lastPausedTime = undefined;
      await TimerStore.save(timer);

      await this.eventBus.publish(
        "TIMER_RESUMED",
        { timerId, jobId: timer.jobId, correlationId },
        makeSystemContext(correlationId),
        timer.validationRunId
      );
    }
  }

  public async stop(timerId: string, correlationId: string): Promise<void> {
    const timer = await TimerStore.get(timerId);
    if (timer && timer.status !== "STOPPED") {
      timer.status = "STOPPED";
      await TimerStore.save(timer);

      await this.eventBus.publish(
        "TIMER_STOPPED",
        { timerId, jobId: timer.jobId, correlationId },
        makeSystemContext(correlationId),
        timer.validationRunId
      );
    }
  }

  public async restart(timerId: string, limitMinutes: number, correlationId: string): Promise<void> {
    const timer = await TimerStore.get(timerId);
    if (timer) {
      timer.status = "RUNNING";
      timer.startTime = new Date().toISOString();
      timer.lastPausedTime = undefined;
      timer.accumulatedMs = 0;
      timer.limitMinutes = limitMinutes;
      await TimerStore.save(timer);

      await this.eventBus.publish(
        "TIMER_RESTARTED",
        { timerId, jobId: timer.jobId, limitMinutes, correlationId },
        makeSystemContext(correlationId),
        timer.validationRunId
      );
    }
  }

  public async suspend(timerId: string, correlationId: string): Promise<void> {
    const timer = await TimerStore.get(timerId);
    if (timer && timer.status !== "SUSPENDED") {
      timer.status = "SUSPENDED";
      await TimerStore.save(timer);

      await this.eventBus.publish(
        "TIMER_SUSPENDED",
        { timerId, jobId: timer.jobId, correlationId },
        makeSystemContext(correlationId),
        timer.validationRunId
      );
    }
  }

  public async expire(timerId: string, correlationId: string): Promise<void> {
    const timer = await TimerStore.get(timerId);
    if (timer && timer.status === "RUNNING") {
      timer.status = "EXPIRED";
      await TimerStore.save(timer);

      await this.eventBus.publish(
        "TIMER_EXPIRED",
        { timerId, jobId: timer.jobId, timerType: timer.timerType, correlationId },
        makeSystemContext(correlationId),
        timer.validationRunId
      );
    }
  }

  public async cancel(timerId: string, correlationId: string): Promise<void> {
    const timer = await TimerStore.get(timerId);
    if (timer && timer.status !== "CANCELLED") {
      timer.status = "CANCELLED";
      await TimerStore.save(timer);

      await this.eventBus.publish(
        "TIMER_CANCELLED",
        { timerId, jobId: timer.jobId, correlationId },
        makeSystemContext(correlationId),
        timer.validationRunId
      );
    }
  }
}
