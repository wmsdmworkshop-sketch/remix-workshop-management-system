/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Scheduler Policies
 * Bounded Context: Core System / Scheduler Platform
 * Description: Manages retry counts, exponential backoff, and dead letters.
 * =============================================================================
 */

export class SchedulerPolicy {
  /**
   * Calculates backoff retry delay using exponential limits and randomized jitter.
   */
  public static calculateBackoffMs(
    attempt: number,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 30000
  ): number {
    const rawDelay = baseDelayMs * Math.pow(2, attempt);
    const delay = Math.min(rawDelay, maxDelayMs);
    const jitter = Math.random() * 0.2 * delay; // 20% jitter
    return Math.round(delay + jitter);
  }
}
