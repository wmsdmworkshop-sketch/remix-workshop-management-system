/**
 * =============================================================================
 * DWIP Enterprise Event Catalog — Consumer Registry
 * Module: event-catalog/consumer-registry.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 6 (Event Catalog Design)
 *
 * Tracks which platform modules consume which event types.
 * Used by: versioning (deprecation guard), documentation (consumer list).
 * Read-only metadata — does NOT interact with EventBus subscriptions.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type { EventConsumer, ConsumerType } from "./types.ts";

export interface IConsumerRegistry {
  register(consumer: Omit<EventConsumer, "consumerId" | "registeredAt">): EventConsumer;
  deregister(consumerId: string): boolean;
  getConsumer(consumerId: string): EventConsumer | undefined;
  getConsumersByEventType(eventType: string): ReadonlyArray<EventConsumer>;
  getConsumersByType(consumerType: ConsumerType): ReadonlyArray<EventConsumer>;
  listAll(): ReadonlyArray<EventConsumer>;
  countForEventType(eventType: string): number;
}

export class ConsumerRegistry implements IConsumerRegistry {
  private readonly consumers = new Map<string, EventConsumer>();

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  public register(
    consumer: Omit<EventConsumer, "consumerId" | "registeredAt">
  ): EventConsumer {
    if (!consumer.consumerName || consumer.consumerName.trim().length === 0) {
      throw new Error("[ConsumerRegistry] consumerName must not be empty.");
    }
    if (!consumer.subscribedEventTypes || consumer.subscribedEventTypes.length === 0) {
      throw new Error("[ConsumerRegistry] subscribedEventTypes must contain at least one event type.");
    }

    const record: EventConsumer = Object.freeze({
      consumerId: randomUUID(),
      consumerName: consumer.consumerName,
      consumerType: consumer.consumerType,
      subscribedEventTypes: [...consumer.subscribedEventTypes],
      description: consumer.description,
      registeredAt: new Date().toISOString(),
      contactOwner: consumer.contactOwner,
      isActive: consumer.isActive,
    });

    this.consumers.set(record.consumerId, record);
    return record;
  }

  public deregister(consumerId: string): boolean {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) return false;

    const deactivated: EventConsumer = Object.freeze({ ...consumer, isActive: false });
    this.consumers.set(consumerId, deactivated);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  public getConsumer(consumerId: string): EventConsumer | undefined {
    return this.consumers.get(consumerId);
  }

  public getConsumersByEventType(eventType: string): ReadonlyArray<EventConsumer> {
    return Array.from(this.consumers.values()).filter(
      (c) => c.isActive && c.subscribedEventTypes.includes(eventType)
    );
  }

  public getConsumersByType(consumerType: ConsumerType): ReadonlyArray<EventConsumer> {
    return Array.from(this.consumers.values()).filter(
      (c) => c.isActive && c.consumerType === consumerType
    );
  }

  public listAll(): ReadonlyArray<EventConsumer> {
    return Array.from(this.consumers.values());
  }

  public countForEventType(eventType: string): number {
    return this.getConsumersByEventType(eventType).length;
  }
}
