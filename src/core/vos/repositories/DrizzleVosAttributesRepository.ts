/**
 * DWIP Enterprise WOS - DrizzleVosAttributesRepository
 */

import { IVosAttributesRepository } from '../../../domain/vos/repositories';
import { IVosAttribute } from '../../../domain/vos/types';
import { seedVosAttribute } from '../../../db/seed/vos_seed';

export class DrizzleVosAttributesRepository implements IVosAttributesRepository {
  private store: Map<string, IVosAttribute> = new Map();

  constructor() {
    this.store.set(seedVosAttribute.id, seedVosAttribute);
  }

  public async findByVosId(vosId: string): Promise<IVosAttribute[]> {
    const results: IVosAttribute[] = [];
    for (const attr of this.store.values()) {
      if (attr.vosId === vosId) {
        results.push({ ...attr });
      }
    }
    return results;
  }

  public async findByName(vosId: string, attributeName: string): Promise<IVosAttribute | null> {
    for (const attr of this.store.values()) {
      if (attr.vosId === vosId && attr.attributeName === attributeName) {
        return { ...attr };
      }
    }
    return null;
  }

  public async create(attribute: Omit<IVosAttribute, 'id' | 'publicId' | 'capturedAt' | 'createdAt'>): Promise<IVosAttribute> {
    const id = `attr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const publicId = `PUB_${id.toUpperCase()}`;
    const now = new Date().toISOString();
    const record: IVosAttribute = {
      ...attribute,
      id,
      publicId,
      capturedAt: now,
      createdAt: now
    };
    this.store.set(id, record);
    return { ...record };
  }
}

export const drizzleVosAttributesRepository = new DrizzleVosAttributesRepository();
