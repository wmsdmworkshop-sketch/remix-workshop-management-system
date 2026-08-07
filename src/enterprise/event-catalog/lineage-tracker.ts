/**
 * =============================================================================
 * DWIP Enterprise Event Catalog — Lineage Tracker
 * Module: event-catalog/lineage-tracker.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 6.4 (Event Lineage)
 *
 * Tracks cause-and-effect relationships between events and their workflow stages.
 * Provides graph traversal: which events produce/consume which others.
 * =============================================================================
 */

import type { EventLineageNode, EventLineageGraph } from "./types.ts";

export interface ILineageTracker {
  register(node: EventLineageNode): void;
  getNode(eventType: string): EventLineageNode | undefined;
  getUpstream(eventType: string): ReadonlyArray<string>;
  getDownstream(eventType: string): ReadonlyArray<string>;
  buildGraph(): EventLineageGraph;
  findImpactedBy(eventType: string): ReadonlyArray<string>;
}

export class LineageTracker implements ILineageTracker {
  private readonly nodes = new Map<string, EventLineageNode>();

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  public register(node: EventLineageNode): void {
    if (!node.eventType || node.eventType.trim().length === 0) {
      throw new Error("[LineageTracker] eventType must not be empty.");
    }
    this.nodes.set(node.eventType, Object.freeze({ ...node }));
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  public getNode(eventType: string): EventLineageNode | undefined {
    return this.nodes.get(eventType);
  }

  /**
   * Returns event types that trigger or precede `eventType`.
   * Traverses all nodes to find which ones list `eventType` in their `produces`.
   */
  public getUpstream(eventType: string): ReadonlyArray<string> {
    const upstream: string[] = [];
    for (const node of this.nodes.values()) {
      if (node.produces.includes(eventType)) {
        upstream.push(node.eventType);
      }
    }
    return upstream;
  }

  /**
   * Returns event types that this event produces.
   */
  public getDownstream(eventType: string): ReadonlyArray<string> {
    const node = this.nodes.get(eventType);
    return node ? node.produces : [];
  }

  /**
   * Given an event type, returns all event types that would be impacted
   * (directly or transitively) by a schema change. BFS traversal.
   */
  public findImpactedBy(eventType: string): ReadonlyArray<string> {
    const impacted = new Set<string>();
    const queue: string[] = [eventType];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const downstream = this.getDownstream(current);
      for (const dep of downstream) {
        if (!impacted.has(dep)) {
          impacted.add(dep);
          queue.push(dep);
        }
      }
    }

    return Array.from(impacted);
  }

  public buildGraph(): EventLineageGraph {
    return {
      nodes: Array.from(this.nodes.values()),
      generatedAt: new Date().toISOString(),
    };
  }
}
