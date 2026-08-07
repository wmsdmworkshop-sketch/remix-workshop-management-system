/**
 * DWIP Enterprise - VOS Ownership Engine (Module 5)
 * Sprint 1 Architecture
 * 
 * Tracks custody & ownership handovers of a VOS across workshop roles.
 */

import { VosOwnershipTransfer } from './types';
import { vosAuditEngine } from './VosAuditEngine';
import { vosEventEngine } from './VosEventEngine';

export class VosOwnershipEngine {
  private static instance: VosOwnershipEngine;
  private history: VosOwnershipTransfer[] = [];

  private constructor() {
    this.seedBaselineOwnership();
  }

  public static getInstance(): VosOwnershipEngine {
    if (!VosOwnershipEngine.instance) {
      VosOwnershipEngine.instance = new VosOwnershipEngine();
    }
    return VosOwnershipEngine.instance;
  }

  private seedBaselineOwnership(): void {
    const now = new Date().toISOString();
    this.history.push({
      id: 'transfer_101',
      vosId: 'vos_1001',
      fromUserId: 'usr_system',
      toUserId: 'usr_sec_1',
      fromRole: 'system',
      toRole: 'security_agent',
      reason: 'Initial intake handover',
      transferredAt: now
    });
  }

  public async transferOwnership(
    params: Omit<VosOwnershipTransfer, 'id' | 'transferredAt'>
  ): Promise<VosOwnershipTransfer> {
    const record: VosOwnershipTransfer = {
      ...params,
      id: `transfer_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      transferredAt: new Date().toISOString()
    };

    this.history.unshift(record);

    // Emit event & log audit
    await vosEventEngine.emitEvent({
      vosId: record.vosId,
      eventType: 'VOS_OWNERSHIP_TRANSFERRED',
      payload: {
        fromUserId: record.fromUserId,
        toUserId: record.toUserId,
        fromRole: record.fromRole,
        toRole: record.toRole,
        reason: record.reason
      },
      actorId: record.fromUserId,
      actorRole: record.fromRole,
      correlationId: `corr_transfer_${record.id}`
    });

    return record;
  }

  public getHistoryForVos(vosId: string): VosOwnershipTransfer[] {
    return this.history.filter(h => h.vosId === vosId);
  }

  public getAllHistory(): VosOwnershipTransfer[] {
    return [...this.history];
  }
}

export const vosOwnershipEngine = VosOwnershipEngine.getInstance();
