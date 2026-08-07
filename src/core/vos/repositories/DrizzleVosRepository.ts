/**
 * DWIP Enterprise WOS - DrizzleVosRepository
 * Task 1.2 In-Memory / Drizzle Production Repository Implementation
 */

import { IVosRepository } from '../../../domain/vos/repositories';
import { IVos } from '../../../domain/vos/types';
import { VosMapper } from '../utils/VosMapper';
import { seedVosRecord } from '../../../db/seed/vos_seed';

export class DrizzleVosRepository implements IVosRepository {
  private store: Map<string, IVos> = new Map();

  constructor() {
    this.seedBaseline();
  }

  private seedBaseline(): void {
    const seed = VosMapper.toDomain(seedVosRecord);
    this.store.set(seed.id, seed);
  }

  public async findById(id: string): Promise<IVos | null> {
    const record = this.store.get(id);
    if (!record || record.isDeleted) return null;
    return { ...record };
  }

  public async findByPublicId(publicId: string): Promise<IVos | null> {
    for (const record of this.store.values()) {
      if (record.publicId === publicId && !record.isDeleted) {
        return { ...record };
      }
    }
    return null;
  }

  public async findByVosNumber(vosNumber: string): Promise<IVos | null> {
    for (const record of this.store.values()) {
      if (record.vosNumber === vosNumber && !record.isDeleted) {
        return { ...record };
      }
    }
    return null;
  }

  public async findActiveByVehicleId(vehicleId: string): Promise<IVos | null> {
    for (const record of this.store.values()) {
      if (record.vehicleId === vehicleId && !record.isClosed && !record.isDeleted) {
        return { ...record };
      }
    }
    return null;
  }

  public async findAllByBranch(branchId: string): Promise<IVos[]> {
    const results: IVos[] = [];
    for (const record of this.store.values()) {
      if (record.branchId === branchId && !record.isDeleted) {
        results.push({ ...record });
      }
    }
    return results;
  }

  public async findAllByCompany(companyId: string): Promise<IVos[]> {
    const results: IVos[] = [];
    for (const record of this.store.values()) {
      if (record.companyId === companyId && !record.isDeleted) {
        results.push({ ...record });
      }
    }
    return results;
  }

  public async create(vosData: Omit<IVos, 'id' | 'publicId' | 'createdAt' | 'updatedAt' | 'version'>): Promise<IVos> {
    const id = `vos_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const publicId = `PUB_${id.toUpperCase()}`;
    const now = new Date().toISOString();

    const record: IVos = {
      ...vosData,
      id,
      publicId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isDeleted: false
    };

    this.store.set(id, record);
    return { ...record };
  }

  public async update(id: string, updates: Partial<IVos>): Promise<IVos> {
    const existing = this.store.get(id);
    if (!existing || existing.isDeleted) {
      throw new Error(`[DrizzleVosRepository] VOS ${id} not found`);
    }

    const updatedRecord: IVos = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.store.set(id, updatedRecord);
    return { ...updatedRecord };
  }

  public async softDelete(id: string, deletedBy: string): Promise<boolean> {
    const existing = this.store.get(id);
    if (!existing || existing.isDeleted) return false;

    existing.isDeleted = true;
    existing.deletedAt = new Date().toISOString();
    existing.updatedBy = deletedBy;
    existing.updatedAt = new Date().toISOString();

    this.store.set(id, existing);
    return true;
  }
}

export const drizzleVosRepository = new DrizzleVosRepository();
