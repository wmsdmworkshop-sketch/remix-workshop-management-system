/**
 * DWIP Enterprise Integration Gateway - GatewayHealthService
 * Diagnostics: OEM Connectivity, Token Health, Queue Depths, Latency & Circuit Breaker State
 */

import { SystemHealthReport } from '../types';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';
import { prioritySyncQueue } from '../queue/PrioritySyncQueue';
import { failedRequestQueue } from '../queue/FailedRequestQueue';

export class GatewayHealthService {
  async getHealthReport(providerId: string): Promise<SystemHealthReport> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    const health = await adapter.checkHealth();

    return {
      ...health,
      details: {
        ...health.details,
        queueDepth: prioritySyncQueue.getQueueDepth(),
        retryQueueDepth: failedRequestQueue.getQueueDepth()
      }
    };
  }
}
