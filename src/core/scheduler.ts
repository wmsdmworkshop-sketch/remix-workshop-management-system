/**
 * =============================================================================
 * WOS Core Architecture: Scheduler Interface
 * Bounded Context: Core System / Cron & Automation
 * Description: Manages scheduling, lifecycle tracking, and triggers for recurring
 *              background automation tasks.
 * =============================================================================
 */

import { IEventBus } from "./event-bus";

export interface ScheduledTask {
  taskId: string;
  name: string;
  cronExpression: string;
  isRecurring: boolean;
  isActive: boolean;
  lastExecutedAt?: string;
  nextExecutionAt: string;
}

export interface IScheduler {
  readonly eventBus: IEventBus;

  /**
   * Registers a callback-driven cron action.
   */
  scheduleJob(
    name: string,
    cronExpression: string,
    action: (correlationId: string) => void | Promise<void>,
    correlationId: string
  ): Promise<string>;

  /**
   * Immediately halts execution of a registered job block.
   */
  cancelJob(taskId: string, correlationId: string): Promise<boolean>;

  /**
   * Returns metadata for all scheduled tasks.
   */
  getTasksList(correlationId: string): Promise<ScheduledTask[]>;
}
