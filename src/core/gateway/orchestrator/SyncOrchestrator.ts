/**
 * DWIP Enterprise Integration Gateway - SyncOrchestrator
 * Architecture: DWIP-INT-ARCH-001 v1.0 (ADR-002)
 */

import { SyncState, SyncHistoryItem } from '../types';
import { integrationEventPublisher } from '../events/IntegrationEventPublisher';
import { GatewayMasterSyncService } from '../services/GatewayMasterSyncService';
import { StructuredLogger } from '../../vos/utils/StructuredLogger';

export class SyncOrchestrator {
  private activeSyncs: Map<string, SyncHistoryItem> = new Map();

  constructor(private masterSyncService: GatewayMasterSyncService = new GatewayMasterSyncService()) {}

  public async startSync(
    providerId: string,
    syncMode: 'FULL' | 'INCREMENTAL' | 'MANUAL' | 'BACKGROUND',
    entityType?: string,
    correlationId?: string
  ): Promise<SyncHistoryItem> {
    const batchId = `sync_${providerId}_${Date.now()}`;
    const record: SyncHistoryItem = {
      id: `hist_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      batchId,
      providerId,
      syncMode,
      entityType,
      recordsProcessed: 0,
      recordsFailed: 0,
      status: SyncState.RUNNING,
      startedAt: new Date().toISOString()
    };

    this.activeSyncs.set(batchId, record);

    integrationEventPublisher.publish({
      eventType: 'SyncStarted',
      providerId,
      timestamp: record.startedAt,
      correlationId,
      details: { batchId, syncMode, entityType }
    });

    try {
      // 1. Dependency ordering execution
      const syncResult = await this.masterSyncService.triggerFullMasterSync(providerId, entityType);

      record.recordsProcessed = syncResult.totalRecords;
      record.status = SyncState.SUCCESS;
      record.completedAt = new Date().toISOString();

      integrationEventPublisher.publish({
        eventType: 'SyncCompleted',
        providerId,
        timestamp: record.completedAt,
        correlationId,
        details: { batchId, totalProcessed: record.recordsProcessed }
      });

      StructuredLogger.info(`SyncOrchestrator completed ${syncMode} sync for ${providerId}`, {
        component: 'SyncOrchestrator',
        operation: 'startSync',
        result: 'SUCCESS',
        batchId,
        providerId
      });

      return record;
    } catch (err: any) {
      record.status = SyncState.FAILED;
      record.completedAt = new Date().toISOString();
      record.errorLog = [err.message || String(err)];

      integrationEventPublisher.publish({
        eventType: 'SyncFailed',
        providerId,
        timestamp: record.completedAt,
        correlationId,
        details: { batchId, error: err.message }
      });

      StructuredLogger.error(
        `SyncOrchestrator failed ${syncMode} sync for ${providerId}`,
        {
          component: 'SyncOrchestrator',
          operation: 'startSync',
          result: 'FAILURE',
          batchId,
          providerId
        },
        err
      );

      return record;
    }
  }

  public cancelSync(batchId: string): boolean {
    const item = this.activeSyncs.get(batchId);
    if (item && item.status === SyncState.RUNNING) {
      item.status = SyncState.CANCELLED;
      item.completedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  public getSyncStatus(batchId: string): SyncHistoryItem | undefined {
    return this.activeSyncs.get(batchId);
  }
}

export const syncOrchestrator = new SyncOrchestrator();
