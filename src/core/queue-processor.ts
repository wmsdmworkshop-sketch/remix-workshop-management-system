/**
 * =============================================================================
 * WOS Core Architecture: QueueProcessor Interface
 * Bounded Context: Core System / Task Worker Queues
 * Description: Abstraction over task worker queues to process asynchronous
 *              background jobs safely.
 * =============================================================================
 */

import { IEventBus } from "./event-bus";

export interface QueueJob<T = any> {
  jobId: string;
  queueName: string;
  payload: T;
  attempts: number;
  maxAttempts: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  errorReason?: string;
  createdAt: string;
}

export type JobExecutor<T = any> = (job: QueueJob<T>, correlationId: string) => Promise<void>;

export interface IQueueProcessor {
  readonly eventBus: IEventBus;

  /**
   * Enqueues an execution task payload.
   */
  enqueue<T>(
    queueName: string,
    payload: T,
    maxAttempts: number,
    correlationId: string
  ): Promise<string>;

  /**
   * Registers a worker callback executor for a specific queue category.
   */
  registerWorker<T>(
    queueName: string,
    executor: JobExecutor<T>,
    correlationId: string
  ): void;
}
