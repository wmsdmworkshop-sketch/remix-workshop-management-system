/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Timer Polling Worker
 * Bounded Context: Core System / Timer Platform
 * Description: Background polling worker that scans active DB-backed timers,
 *              calculates elapsed hours via calendar rules, and marks expiry.
 * =============================================================================
 */

import { TimerEngine } from "./timer-engine";
import { TimerCalendar } from "./timer-calendar";
import { TimerStore } from "./timer-store";

export class TimerWorker {
  private processing = false;

  constructor(
    private readonly engine: TimerEngine,
    private readonly calendar: TimerCalendar
  ) {}

  /**
   * Background scan that updates and expires active timers.
   */
  public async scanAndProcess(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const activeTimers = await TimerStore.getActiveTimers();

      for (const timer of activeTimers) {
        // Calculate elapsed minutes excluding weekends and non-business hours if policy dictates
        let elapsedMinutes = 0;
        const now = Date.now();
        const start = new Date(timer.startTime).getTime();
        const totalRawMs = now - start - timer.accumulatedMs;

        if (timer.policy.businessHoursOnly) {
          // Calculate active minutes within shift boundaries
          let currentCursor = start;
          let activeMs = 0;

          // Process in 5-minute chunks for precision
          const stepMs = 5 * 60 * 1000;
          while (currentCursor < now) {
            const cursorDate = new Date(currentCursor);
            if (!this.calendar.isHoliday(cursorDate) && this.calendar.isWorkingTime(cursorDate)) {
              activeMs += Math.min(stepMs, now - currentCursor);
            }
            currentCursor += stepMs;
          }
          elapsedMinutes = Math.floor(activeMs / 1000 / 60);
        } else {
          elapsedMinutes = Math.floor(totalRawMs / 1000 / 60);
        }

        if (elapsedMinutes >= timer.limitMinutes) {
          await this.engine.expire(timer.timerId, timer.correlationId);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
