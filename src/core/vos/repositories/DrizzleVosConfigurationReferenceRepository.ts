/**
 * DWIP Enterprise WOS - DrizzleVosConfigurationReferenceRepository
 */

import { IVosConfigurationReferenceRepository } from '../../../domain/vos/repositories';
import { IVosConfigurationReference } from '../../../domain/vos/types';
import { seedVosConfigRef } from '../../../db/seed/vos_seed';

export class DrizzleVosConfigurationReferenceRepository implements IVosConfigurationReferenceRepository {
  private store: Map<string, IVosConfigurationReference> = new Map();

  constructor() {
    this.store.set(seedVosConfigRef.vosId, seedVosConfigRef);
  }

  public async findByVosId(vosId: string): Promise<IVosConfigurationReference | null> {
    const record = this.store.get(vosId);
    return record ? { ...record } : null;
  }

  public async create(ref: Omit<IVosConfigurationReference, 'id' | 'publicId' | 'createdAt'>): Promise<IVosConfigurationReference> {
    const id = `cfg_ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const publicId = `PUB_${id.toUpperCase()}`;
    const record: IVosConfigurationReference = {
      ...ref,
      id,
      publicId,
      createdAt: new Date().toISOString()
    };
    this.store.set(ref.vosId, record);
    return { ...record };
  }
}

export const drizzleVosConfigurationReferenceRepository = new DrizzleVosConfigurationReferenceRepository();
