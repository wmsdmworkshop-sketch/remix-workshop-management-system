/**
 * =============================================================================
 * WOS Core Architecture: EventBus Implementation
 * Bounded Context: Core System / Event Integration
 * Description: Implements decoupled async publishing/subscribing with wildcard
 *              matching, retry policies, and metadata propagation.
 * =============================================================================
 */

export interface EventEnvelope<T = any> {
  eventId: string;
  topic: string;
  timestamp: string;
  correlationId: string;
  validationRunId?: string;
  payload: T;
}

export type EventHandler<T = any> = (event: EventEnvelope<T>) => void | Promise<void>;

export interface IEventBus {
  publish<T>(
    topic: string,
    payload: T,
    correlationId: string,
    validationRunId?: string,
    retryOptions?: RetryOptions
  ): Promise<void>;

  subscribe<T>(topic: string, handler: EventHandler<T>): void;

  unsubscribe<T>(topic: string, handler: EventHandler<T>): void;
}

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
}

export class EventBus implements IEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * Subscribes a handler callback to a specific topic (e.g. "JOB_CREATED")
   * or a wildcard/prefix pattern (e.g. "JOB_*" or "*").
   */
  public subscribe<T>(topic: string, handler: EventHandler<T>): void {
    const list = this.handlers.get(topic) || [];
    list.push(handler);
    this.handlers.set(topic, list);
  }

  /**
   * Unsubscribes a registered handler callback from a topic.
   */
  public unsubscribe<T>(topic: string, handler: EventHandler<T>): void {
    const list = this.handlers.get(topic);
    if (!list) return;

    const filtered = list.filter((h) => h !== handler);
    if (filtered.length === 0) {
      this.handlers.delete(topic);
    } else {
      this.handlers.set(topic, filtered);
    }
  }

  /**
   * Publishes an event payload to all matching topic subscribers asynchronously.
   * Performs automatic retries with exponential backoff on handler failures.
   */
  public async publish<T>(
    topic: string,
    payload: T,
    correlationId: string,
    validationRunId?: string,
    retryOptions: RetryOptions = {}
  ): Promise<void> {
    const maxAttempts = retryOptions.maxAttempts ?? 3;
    const initialDelay = retryOptions.delayMs ?? 50;

    const envelope: EventEnvelope<T> = {
      eventId: `EV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      topic,
      timestamp: new Date().toISOString(),
      correlationId,
      validationRunId,
      payload,
    };

    // Find all handlers matching the topic directly or via wildcard
    const matchedHandlers: EventHandler[] = [];
    for (const [registeredTopic, list] of this.handlers.entries()) {
      if (this.isTopicMatch(registeredTopic, topic)) {
        matchedHandlers.push(...list);
      }
    }

    // Execute handlers concurrently and handle retries asynchronously
    const executions = matchedHandlers.map((handler) =>
      this.executeWithRetry(handler, envelope, maxAttempts, initialDelay)
    );

    await Promise.all(executions);
  }

  /**
   * Evaluates if a registered topic matches the published topic, supporting wildcards.
   * Examples:
   * - registered "JOB_*" matches published "JOB_CREATED" and "JOB_DELETED"
   * - registered "*" matches anything
   * - registered "JOB_CREATED" matches only "JOB_CREATED"
   */
  private isTopicMatch(registered: string, published: string): boolean {
    if (registered === "*") return true;
    if (registered.includes("*")) {
      const regexStr = "^" + registered.replace(/\*/g, ".*") + "$";
      const regex = new RegExp(regexStr);
      return regex.test(published);
    }
    return registered === published;
  }

  /**
   * Executes a handler with automatic exponential backoff retries.
   */
  private async executeWithRetry(
    handler: EventHandler,
    envelope: EventEnvelope,
    maxAttempts: number,
    delayMs: number
  ): Promise<void> {
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        await handler(envelope);
        return; // Success, exit
      } catch (err) {
        attempt++;
        if (attempt >= maxAttempts) {
          console.error(
            `[EventBus] Handler failed for topic "${envelope.topic}" after ${maxAttempts} attempts. Error:`,
            err
          );
          throw err; // Re-throw final execution failure
        }
        const backoffDelay = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }
}
