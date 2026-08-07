/**
 * DWIP Enterprise WOS - DrizzleVosStateHistoryRepository
 */

import { IVosStateHistoryRepository } from '../../../domain/vos/repositories';
import { IVosStateHistory } from '../../../domain/vos/types';
import { seedVosStateHistory } from '../../../db/seed/vos_seed';

export class DrizzleVosStateHistoryRepository implements IVosStateHistoryRepository {
  private store: IVosStateHistory[] = [seedVosStateHistory];

  public async findByVosId(vosId: string): Promise<IVosStateHistory[]> {
    return this.store.filter(h => h.vosId === vosId);
  }

  public async create(history: Omit<IVosStateHistory, 'id' | 'publicId' | 'createdAt'>): Promise<IVosStateHistory> {
    const id = `sh_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const publicId = `PUB_${id.toUpperCase()}`;
    const record: IVosStateHistory = {
      ...history,
      id,
      publicId,
      createdAt: new Date().toISOString()
    };
    this.store.unshift(record);
    return { ...record };
  }
}

export const drizzleVosStateHistoryRepository = new DrizzleVosStateHistoryRepository();
