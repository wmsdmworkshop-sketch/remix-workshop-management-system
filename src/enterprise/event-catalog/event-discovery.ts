/**
 * =============================================================================
 * DWIP Enterprise Event Catalog — Event Discovery
 * Module: event-catalog/event-discovery.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 6 (Event Catalog Design)
 *
 * Provides searchable, filterable discovery of all registered event types.
 * Used by analytics teams, AI platform, and developer tooling to find events.
 * Read-only — delegates to CatalogRegistry for data access.
 * =============================================================================
 */

import type {
  EventDefinition,
  EventDiscoveryQuery,
  EventDiscoveryResult,
  EventCatalogDomain,
  EventCategory,
} from "./types.ts";
import type { IConsumerRegistry } from "./consumer-registry.ts";

export interface ICatalogReader {
  listDefinitions(): ReadonlyArray<EventDefinition>;
  getDefinition(eventType: string): EventDefinition | undefined;
}

export interface IEventDiscovery {
  search(query: EventDiscoveryQuery): ReadonlyArray<EventDiscoveryResult>;
  findByTag(tag: string): ReadonlyArray<EventDiscoveryResult>;
  findByDomain(domain: EventCatalogDomain): ReadonlyArray<EventDiscoveryResult>;
  findCritical(): ReadonlyArray<EventDiscoveryResult>;
  findDeprecated(): ReadonlyArray<EventDiscoveryResult>;
  summarize(): EventCatalogSummary;
}

export interface EventCatalogSummary {
  readonly totalEvents: number;
  readonly criticalEvents: number;
  readonly deprecatedEvents: number;
  readonly byDomain: Readonly<Record<string, number>>;
  readonly byCategory: Readonly<Record<string, number>>;
  readonly generatedAt: string;
}

export class EventDiscoveryService implements IEventDiscovery {
  constructor(
    private readonly catalogReader: ICatalogReader,
    private readonly consumerRegistry: IConsumerRegistry
  ) {}

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  public search(query: EventDiscoveryQuery): ReadonlyArray<EventDiscoveryResult> {
    let results = this.catalogReader.listDefinitions();

    if (query.domain) {
      results = results.filter((e) => e.domain === query.domain);
    }
    if (query.category) {
      results = results.filter((e) => e.category === query.category);
    }
    if (query.tag) {
      results = results.filter((e) => e.tags.includes(query.tag!));
    }
    if (query.producer) {
      results = results.filter((e) =>
        e.producer.toLowerCase().includes(query.producer!.toLowerCase())
      );
    }
    if (query.isCritical !== undefined) {
      results = results.filter((e) => e.isCritical === query.isCritical);
    }
    if (query.isDeprecated !== undefined) {
      results = results.filter((e) => e.isDeprecated === query.isDeprecated);
    }
    if (query.searchText) {
      const text = query.searchText.toLowerCase();
      results = results.filter(
        (e) =>
          e.eventType.toLowerCase().includes(text) ||
          e.description.toLowerCase().includes(text) ||
          e.tags.some((t) => t.toLowerCase().includes(text))
      );
    }

    return results.map((e) => this.toDiscoveryResult(e));
  }

  // ---------------------------------------------------------------------------
  // Convenience Finders
  // ---------------------------------------------------------------------------

  public findByTag(tag: string): ReadonlyArray<EventDiscoveryResult> {
    return this.search({ tag });
  }

  public findByDomain(domain: EventCatalogDomain): ReadonlyArray<EventDiscoveryResult> {
    return this.search({ domain });
  }

  public findCritical(): ReadonlyArray<EventDiscoveryResult> {
    return this.search({ isCritical: true });
  }

  public findDeprecated(): ReadonlyArray<EventDiscoveryResult> {
    return this.search({ isDeprecated: true });
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  public summarize(): EventCatalogSummary {
    const all = this.catalogReader.listDefinitions();

    const byDomain: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const event of all) {
      byDomain[event.domain] = (byDomain[event.domain] ?? 0) + 1;
      byCategory[event.category] = (byCategory[event.category] ?? 0) + 1;
    }

    return {
      totalEvents: all.length,
      criticalEvents: all.filter((e) => e.isCritical).length,
      deprecatedEvents: all.filter((e) => e.isDeprecated).length,
      byDomain,
      byCategory,
      generatedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private toDiscoveryResult(definition: EventDefinition): EventDiscoveryResult {
    return {
      eventType: definition.eventType,
      catalogId: definition.catalogId,
      domain: definition.domain,
      category: definition.category,
      description: definition.description,
      schemaVersion: definition.schemaVersion,
      isCritical: definition.isCritical,
      isDeprecated: definition.isDeprecated,
      consumerCount: this.consumerRegistry.countForEventType(definition.eventType),
    };
  }
}
