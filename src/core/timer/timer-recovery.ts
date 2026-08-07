/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Timer Recovery Manager
 * Bounded Context: Core System / Timer Platform
 * Description: Scans DB-backed timers post-crash/restart to re-align status.
 * =============================================================================
 */

import { TimerStore } from "./timer-store";
import { TimerEngine } from "./timer-engine";
import { makeSystemContext } from "../business-context";

export class TimerRecovery {
  constructor(private readonly engine: TimerEngine) {}

  /**
   * Scans and recovers active timers post-restart or node failover.
   */
  public async recoverTimers(correlationId: string): Promise<number> {
    const activeTimers = await TimerStore.getActiveTimers();
    let recoveredCount = 0;

    for (const timer of activeTimers) {
      if (timer.status === "RUNNING") {
        // If it was paused in-memory or connection dropped, restore it in DB
        // Optionally recalibrate timing differences since server downtime
        await TimerStore.save(timer);
        recoveredCount++;

        await this.engine.eventBus.publish(
          "TIMER_RECOVERED",
          { timerId: timer.timerId, jobId: timer.jobId, correlationId },
          makeSystemContext(correlationId),
          timer.validationRunId
        );
      }
    }

    return recoveredCount;
  }
}
