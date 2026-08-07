/**
 * DWIP Enterprise Integration Gateway - v1 Contracts
 * IMasterDataContract: Master Data API Contract Interface v1
 */

import { SyncStatus } from '../../types';

export interface IMasterDataContractV1 {
  readonly contractVersion: 'v1';

  triggerFullMasterSync(entityType?: string): Promise<{ batchId: string; totalRecords: number; status: SyncStatus }>;
  getSyncProgress(batchId: string): Promise<{ processed: number; total: number; errors: string[]; completed: boolean }>;
}
