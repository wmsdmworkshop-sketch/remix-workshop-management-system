/**
 * DWIP Enterprise WOS - DrizzleVosOwnerHistoryRepository
 */

import { IVosOwnerHistoryRepository } from '../../../domain/vos/repositories';
import { IVosOwnerHistory } from '../../../domain/vos/types';
import { seedVosOwnerHistory } from '../../../db/seed/vos_seed';

export class DrizzleVosOwnerHistoryRepository implements IVosOwnerHistoryRepository {
  private store: IVosOwnerHistory[] = [seedVosOwnerHistory];

  public async findByVosId(vosId: string): Promise<IVosOwnerHistory[]> {
    return this.store.filter(h => h.vosId === vosId);
  }

  public async create(history: Omit<IVosOwnerHistory, 'id' | 'publicId' | 'createdAt'>): Promise<IVosOwnerHistory> {
    const id = `oh_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const publicId = `PUB_${id.toUpperCase()}`;
    const record: IVosOwnerHistory = {
      ...history,
      id,
      publicId,
      createdAt: new Date().toISOString()
    };
    this.store.unshift(record);
    return { ...record };
  }
}

export const drizzleVosOwnerHistoryRepository = new DrizzleVosOwnerHistoryRepository();
