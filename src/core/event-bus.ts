/**
 * =============================================================================
 * WOS Core Architecture: EventBus Implementation
 * Bounded Context: Core System / Event Integration
 * Description: Implements decoupled async publishing/subscribing with wildcard
 *              matching, retry policies, and metadata propagation.
 * =============================================================================
 */

import { BusinessContext } from "./kernel-contracts";

export interface DomainEventEnvelope<T = any> {
  eventId: string;
  topic: string;
  timestamp: string;
  context: BusinessContext;
  correlationId: string;
  source: string;
  actor: {
    user_id: string;
    role: string;
    branch_id?: string;
    workshop_id?: string;
  };
  validationRunId?: string;
  payload: T;
}

export type EventHandler<T = any> = (event: DomainEventEnvelope<T>) => void | Promise<void>;

export interface IEventBus {
  publish<T>(
    topic: string,
    payload: T,
    context: BusinessContext | string,
    validationRunId?: string,
    retryOptions?: RetryOptions
  ): Promise<void>;

  stageEvent<T>(
    topic: string,
    payload: T,
    context: BusinessContext | string,
    txConnection: any
  ): Promise<void>;

  processOutbox(dbState: any): Promise<void>;

  subscribe<T>(topic: string, handler: EventHandler<T>): void;

  unsubscribe<T>(topic: string, handler: EventHandler<T>): void;
  
  dispatchEnvelope(envelope: DomainEventEnvelope): Promise<void>;
}

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
}

export interface DeadLetterRecord {
  eventId: string;
  topic: string;
  envelope: DomainEventEnvelope;
  error: string;
  failedAt: string;
  attempts: number;
}

export class IdempotencyRegistry {
  private processedEvents = new Set<string>();

  public isDuplicate(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  public markProcessed(eventId: string): void {
    this.processedEvents.add(eventId);
  }

  public clear(): void {
    this.processedEvents.clear();
  }
}

export const globalIdempotencyRegistry = new IdempotencyRegistry();

export class EventBus implements IEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  public deadLetterQueue: DeadLetterRecord[] = [];

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
   * Helper to build a DomainEventEnvelope from parameters.
   */
  private createEnvelope<T>(
    topic: string,
    payload: T,
    context: BusinessContext | string,
    validationRunId?: string
  ): DomainEventEnvelope<T> {
    let businessCtx: BusinessContext;
    let correlationId: string;
    let source: string;
    let actor: { user_id: string; role: string; branch_id?: string; workshop_id?: string };

    if (typeof context === "string") {
      correlationId = context;
      source = "SYSTEM";
      actor = { user_id: "SYSTEM", role: "SYSTEM" };
      businessCtx = {
        identity: { entity_type: "SYSTEM", entity_id: "DWIP-KERNEL" },
        actor,
        traceability: {
          correlation_id: correlationId,
          timestamp: new Date().toISOString(),
          source_system: source,
        },
      };
    } else {
      businessCtx = context;
      correlationId = context.traceability?.correlation_id || `CORR-${Date.now()}`;
      source = context.traceability?.source_system || "SYSTEM";
      actor = {
        user_id: context.actor?.user_id || "SYSTEM",
        role: context.actor?.role || "SYSTEM",
        branch_id: context.actor?.branch_id,
        workshop_id: context.actor?.workshop_id,
      };
    }

    return {
      eventId: `EV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      topic,
      timestamp: new Date().toISOString(),
      context: businessCtx,
      correlationId,
      source,
      actor,
      validationRunId,
      payload,
    };
  }

  /**
   * Publishes an event payload to all matching topic subscribers asynchronously.
   * Performs automatic retries with exponential backoff on handler failures.
   */
  public async publish<T>(
    topic: string,
    payload: T,
    context: BusinessContext | string,
    validationRunId?: string,
    retryOptions: RetryOptions = {}
  ): Promise<void> {
    const maxAttempts = retryOptions.maxAttempts ?? 3;
    const initialDelay = retryOptions.delayMs ?? 50;

    const envelope = this.createEnvelope(topic, payload, context, validationRunId);

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
   * Dispatches an existing envelope to all matching handlers.
   * Typically called by the generic OutboxService after fetching from DB.
   */
  public async dispatchEnvelope(envelope: DomainEventEnvelope): Promise<void> {
    const matchedHandlers: EventHandler[] = [];
    for (const [registeredTopic, list] of this.handlers.entries()) {
      if (this.isTopicMatch(registeredTopic, envelope.topic)) {
        matchedHandlers.push(...list);
      }
    }

    const executions = matchedHandlers.map((handler) =>
      this.executeWithRetry(handler, envelope, 3, 50)
    );

    await Promise.all(executions);
  }

  /**
   * Stages an event within a transactional boundary.
   * Delegate to the generic OutboxService.
   */
  public async stageEvent<T>(
    topic: string,
    payload: T,
    context: BusinessContext | string,
    txConnection: any
  ): Promise<void> {
    const envelope = this.createEnvelope(topic, payload, context);
    
    // Defer the import to avoid circular dependency
    const { globalOutboxService } = await import('./outbox-service.js');
    await globalOutboxService.stageEvent(envelope, txConnection);
  }

  /**
   * Deprecated in favor of globalOutboxService.processOutbox() polling mechanism.
   * Kept for interface compatibility but is a no-op if no memory outbox exists.
   */
  public async processOutbox(dbState: any): Promise<void> {
    if (!dbState.outbox || dbState.outbox.length === 0) return;

    const eventsToProcess = [...dbState.outbox];
    dbState.outbox = []; // Clear processed

    for (const envelope of eventsToProcess) {
      this.dispatchEnvelope(envelope).catch(e => console.error("Async outbox dispatch error", e));
    }
  }

  /**
   * Evaluates if a registered topic matches the published topic, supporting wildcards.
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
   * If retries are exhausted, the event is routed to the Dead Letter Queue.
   */
  private async executeWithRetry(
    handler: EventHandler,
    envelope: DomainEventEnvelope,
    maxAttempts: number,
    delayMs: number
  ): Promise<void> {
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        await handler(envelope);
        return; // Success, exit
      } catch (err: any) {
        attempt++;
        if (attempt >= maxAttempts) {
          console.error(
              `[EventBus] Handler failed for topic "${envelope.topic}" after ${maxAttempts} attempts. Routing to DLQ. Error:`,
              err
          );
          // Route to Dead Letter Queue
          this.deadLetterQueue.push({
            eventId: envelope.eventId,
            topic: envelope.topic,
            envelope,
            error: err.message || String(err),
            failedAt: new Date().toISOString(),
            attempts: attempt,
          });
          return; // Do not re-throw, it is routed to DLQ now
        }
        const backoffDelay = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }
}

export const globalEventBus = new EventBus();
