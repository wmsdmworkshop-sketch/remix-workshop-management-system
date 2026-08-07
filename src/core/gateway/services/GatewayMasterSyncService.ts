/**
 * DWIP Enterprise Integration Gateway - GatewayMasterSyncService
 */

import { SyncStatus } from '../types';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';

export class GatewayMasterSyncService {
  async triggerFullMasterSync(providerId: string, entityType?: string): Promise<{ batchId: string; totalRecords: number; status: SyncStatus }> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.triggerFullMasterSync(entityType);
  }

  async getSyncProgress(providerId: string, batchId: string): Promise<{ processed: number; total: number; errors: string[]; completed: boolean }> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.getSyncProgress(batchId);
  }
}
