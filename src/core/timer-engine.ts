/**
 * =============================================================================
 * WOS Core Architecture: TimerEngine Interface
 * Bounded Context: Core System / SLA Timers
 * Description: Monitors operational time-in-state limits and triggers SLA alerts.
 * =============================================================================
 */

import { IEventBus } from "./event-bus";

export interface TimerStatus {
  timerId: string;
  jobId: number;
  state: string;
  startedAt: string;
  limitMinutes: number;
  elapsedMinutes: number;
  isBreached: boolean;
}

export interface ITimerEngine {
  readonly eventBus: IEventBus;

  /**
   * Spawns a tracking state timer for a job card when it enters a workflow stage.
   */
  startTimer(jobId: number, state: string, limitMinutes: number, correlationId: string): Promise<string>;

  /**
   * Halts and deletes the active tracking timer when a state transitions successfully.
   */
  stopTimer(jobId: number, state: string, correlationId: string): Promise<number>;

  /**
   * Retrieves status parameters of all active timers.
   */
  getActiveTimers(correlationId: string): Promise<TimerStatus[]>;
}
