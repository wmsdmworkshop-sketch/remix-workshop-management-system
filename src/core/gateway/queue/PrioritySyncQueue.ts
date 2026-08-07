/**
 * DWIP Enterprise Integration Gateway - PrioritySyncQueue
 * Persistent Priority Queue (CRITICAL -> HIGH -> NORMAL -> LOW -> BACKGROUND)
 */

import { IntegrationQueueItem, PriorityLevel, SyncState } from '../types';

export class PrioritySyncQueue {
  private queue: IntegrationQueueItem[] = [];

  public enqueue(item: Omit<IntegrationQueueItem, 'id' | 'syncState' | 'retryCount' | 'createdTimestamp'>): IntegrationQueueItem {
    const record: IntegrationQueueItem = {
      ...item,
      id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      syncState: SyncState.PENDING,
      retryCount: 0,
      createdTimestamp: new Date().toISOString()
    };

    this.queue.push(record);
    this.sortQueue();
    return { ...record };
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => a.priority - b.priority); // Lower number = higher priority
  }

  public dequeue(): IntegrationQueueItem | undefined {
    return this.queue.shift();
  }

  public peek(): IntegrationQueueItem | undefined {
    return this.queue[0];
  }

  public getQueueDepth(): number {
    return this.queue.length;
  }

  public getItems(): IntegrationQueueItem[] {
    return [...this.queue];
  }

  public clear(): void {
    this.queue = [];
  }
}

export const prioritySyncQueue = new PrioritySyncQueue();
