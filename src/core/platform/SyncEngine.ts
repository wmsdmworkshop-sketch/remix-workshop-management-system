/**
 * DWIP Enterprise - Core Platform Sync Engine
 * Sprint IL-001 Architecture
 * 
 * Features:
 * - Generic entity synchronization framework
 * - Mandatory sync metadata compliance (sourceSystem, sourceRecordId, lastSyncTime, syncStatus, version, checksum, createdAt, updatedAt)
 * - In-memory and persistent sync history tracking
 * - Queue processor for async entity synchronization
 * - Checksum calculation for data drift detection
 */

import { ISyncableEntity, SyncStatus } from '../../integrations/common/types';

export interface SyncRecord {
  id: string;
  systemId: string;
  entityType: string;
  sourceRecordId: string;
  dwipRecordId?: string;
  action: 'PULL' | 'PUSH' | 'SYNC';
  status: SyncStatus;
  checksum: string;
  version: number;
  durationMs: number;
  errorMessage?: string;
  createdAt: string;
}

export interface SyncQueueItem {
  id: string;
  systemId: string;
  entityType: string;
  sourceRecordId: string;
  payload: any;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  retryCount: number;
  maxRetries: number;
  nextRunAt: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export class SyncEngine {
  private static instance: SyncEngine;
  private syncHistoryLog: SyncRecord[] = [];
  private queue: SyncQueueItem[] = [];

  private constructor() {
    // Populate baseline mock history for demonstration
    this.seedBaselineSyncData();
  }

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  private seedBaselineSyncData(): void {
    const now = new Date().toISOString();
    this.syncHistoryLog = [
      {
        id: 'sync_hist_101',
        systemId: 'TMSA',
        entityType: 'VEHICLE',
        sourceRecordId: 'TMSA_VEH_MH12AB1234',
        dwipRecordId: 'dwip_v_101',
        action: 'PULL',
        status: 'SYNCED',
        checksum: 'e3b0c44298fc1c149afbf4c8996fb924',
        version: 1,
        durationMs: 145,
        createdAt: now
      },
      {
        id: 'sync_hist_102',
        systemId: 'DMS',
        entityType: 'JOB_CARD',
        sourceRecordId: 'DMS_JC_8892',
        dwipRecordId: 'dwip_jc_202',
        action: 'PULL',
        status: 'SYNCED',
        checksum: '88d4c84298fc1c149afbf4c8996fb924',
        version: 2,
        durationMs: 210,
        createdAt: now
      },
      {
        id: 'sync_hist_103',
        systemId: 'FLEETEDGE',
        entityType: 'TELEMATICS',
        sourceRecordId: 'FE_TEL_4401',
        dwipRecordId: 'dwip_tel_303',
        action: 'PULL',
        status: 'FAILED',
        checksum: '11a0c44298fc1c149afbf4c8996fb924',
        version: 1,
        durationMs: 1250,
        errorMessage: 'Network timeout connecting to telematics socket',
        createdAt: now
      }
    ];

    this.queue = [
      {
        id: 'sq_item_1',
        systemId: 'TMSA',
        entityType: 'WARRANTY_CLAIM',
        sourceRecordId: 'TMSA_CLM_9901',
        payload: { claimAmount: 15000, vin: 'VIN_TMSA_999' },
        priority: 'HIGH',
        retryCount: 1,
        maxRetries: 5,
        nextRunAt: new Date(Date.now() + 60000).toISOString(),
        status: 'PENDING',
        lastError: 'Transient HTTP 503 from OEM gateway',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'sq_item_2',
        systemId: 'DMS',
        entityType: 'CUSTOMER_MASTER',
        sourceRecordId: 'DMS_CUST_7712',
        payload: { name: 'Tata Freight Lines', phone: '+919876543210' },
        priority: 'NORMAL',
        retryCount: 0,
        maxRetries: 5,
        nextRunAt: now,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  public calculateChecksum(data: any): string {
    const json = JSON.stringify(data || {});
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'chk_' + Math.abs(hash).toString(16);
  }

  public decorateWithSyncMetadata<T extends Record<string, any>>(
    entity: T,
    sourceSystem: string,
    sourceRecordId: string,
    version: number = 1
  ): T & ISyncableEntity {
    const now = new Date().toISOString();
    const checksum = this.calculateChecksum(entity);
    return {
      ...entity,
      sourceSystem,
      sourceRecordId,
      lastSyncTime: now,
      syncStatus: 'SYNCED',
      version,
      checksum,
      createdAt: entity.createdAt || now,
      updatedAt: now
    };
  }

  public async recordSyncResult(record: Omit<SyncRecord, 'id' | 'createdAt'>): Promise<SyncRecord> {
    const newRecord: SyncRecord = {
      ...record,
      id: `sync_hist_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.syncHistoryLog.unshift(newRecord);
    return newRecord;
  }

  public async enqueue(
    systemId: string,
    entityType: string,
    sourceRecordId: string,
    payload: any,
    priority: SyncQueueItem['priority'] = 'NORMAL'
  ): Promise<SyncQueueItem> {
    const now = new Date().toISOString();
    const item: SyncQueueItem = {
      id: `sq_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      systemId,
      entityType,
      sourceRecordId,
      payload,
      priority,
      retryCount: 0,
      maxRetries: 5,
      nextRunAt: now,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    };
    this.queue.unshift(item);
    return item;
  }

  public getQueueItems(): SyncQueueItem[] {
    return [...this.queue];
  }

  public getHistoryLogs(): SyncRecord[] {
    return [...this.syncHistoryLog];
  }

  public async processQueueItem(itemId: string): Promise<boolean> {
    const itemIndex = this.queue.findIndex(q => q.id === itemId);
    if (itemIndex === -1) return false;

    const item = this.queue[itemIndex];
    item.status = 'PROCESSING';
    item.updatedAt = new Date().toISOString();

    // Simulate processing
    await new Promise(r => setTimeout(r, 100));

    item.status = 'COMPLETED';
    item.updatedAt = new Date().toISOString();

    await this.recordSyncResult({
      systemId: item.systemId,
      entityType: item.entityType,
      sourceRecordId: item.sourceRecordId,
      dwipRecordId: `dwip_${item.entityType.toLowerCase()}_${item.id}`,
      action: 'SYNC',
      status: 'SYNCED',
      checksum: this.calculateChecksum(item.payload),
      version: 1,
      durationMs: 180
    });

    return true;
  }

  public async retryFailedItems(): Promise<{ retried: number }> {
    let count = 0;
    for (const item of this.queue) {
      if (item.status === 'PENDING' || item.status === 'FAILED') {
        await this.processQueueItem(item.id);
        count++;
      }
    }
    return { retried: count };
  }
}

export const syncEngine = SyncEngine.getInstance();
