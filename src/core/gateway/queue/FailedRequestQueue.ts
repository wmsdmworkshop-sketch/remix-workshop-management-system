/**
 * DWIP Enterprise Integration Gateway - FailedRequestQueue
 * Offloads Failed Requests for Automatic Retries
 */

import { IntegrationQueueItem, SyncState } from '../types';

export class FailedRequestQueue {
  private failedItems: IntegrationQueueItem[] = [];

  public addFailedItem(item: IntegrationQueueItem, reason?: string): void {
    const updated: IntegrationQueueItem = {
      ...item,
      syncState: SyncState.WAITING_RETRY,
      retryCount: item.retryCount + 1
    };

    this.failedItems.push(updated);
  }

  public getFailedItems(): IntegrationQueueItem[] {
    return [...this.failedItems];
  }

  public getQueueDepth(): number {
    return this.failedItems.length;
  }

  public remove(id: string): void {
    this.failedItems = this.failedItems.filter(item => item.id !== id);
  }

  public clear(): void {
    this.failedItems = [];
  }
}

export const failedRequestQueue = new FailedRequestQueue();
