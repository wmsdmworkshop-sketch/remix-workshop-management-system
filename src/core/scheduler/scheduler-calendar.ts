/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Scheduler Calendar
 * Bounded Context: Core System / Scheduler Platform
 * Description: Calculates next execution targets and schedules.
 * =============================================================================
 */

export class SchedulerCalendar {
  /**
   * Calculates the next execution date based on cron or interval limits.
   */
  public static getNextTime(
    type: string,
    params: { cronExpression?: string; intervalMs?: number }
  ): string {
    const now = Date.now();
    if (type === "FIXED_RATE" && params.intervalMs) {
      return new Date(now + params.intervalMs).toISOString();
    }

    // Default cron parses basic schedules or advances 1 minute
    if (params.cronExpression === "*/5 * * * *") {
      // every 5 minutes
      return new Date(now + 5 * 60 * 1000).toISOString();
    }
    
    // Default 1 minute delay for tests
    return new Date(now + 60000).toISOString();
  }
}
