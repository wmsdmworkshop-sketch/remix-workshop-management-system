/**
 * DWIP Enterprise WOS - Repository Contracts (DWIP-DB-001 v1.0)
 * Persistent Domain Foundation Repository Interfaces
 */

import {
  IVos,
  IVosStateHistory,
  IVosOwnerHistory,
  IVosTimeline,
  IVosConfigurationReference,
  IVosLink,
  IVosAttribute,
  IVosTag
} from './types';

export interface IVosRepository {
  findById(id: string): Promise<IVos | null>;
  findByPublicId(publicId: string): Promise<IVos | null>;
  findByVosNumber(vosNumber: string): Promise<IVos | null>;
  findActiveByVehicleId(vehicleId: string): Promise<IVos | null>;
  findAllByBranch(branchId: string): Promise<IVos[]>;
  findAllByCompany(companyId: string): Promise<IVos[]>;
  create(vos: Omit<IVos, 'id' | 'publicId' | 'createdAt' | 'updatedAt' | 'version'>): Promise<IVos>;
  update(id: string, updates: Partial<IVos>): Promise<IVos>;
  softDelete(id: string, deletedBy: string): Promise<boolean>;
}

export interface IVosStateHistoryRepository {
  findByVosId(vosId: string): Promise<IVosStateHistory[]>;
  create(history: Omit<IVosStateHistory, 'id' | 'publicId' | 'createdAt'>): Promise<IVosStateHistory>;
}

export interface IVosOwnerHistoryRepository {
  findByVosId(vosId: string): Promise<IVosOwnerHistory[]>;
  create(history: Omit<IVosOwnerHistory, 'id' | 'publicId' | 'createdAt'>): Promise<IVosOwnerHistory>;
}

export interface IVosTimelineRepository {
  findByVosId(vosId: string, category?: string): Promise<IVosTimeline[]>;
  create(timeline: Omit<IVosTimeline, 'id' | 'publicId' | 'recordedAt'>): Promise<IVosTimeline>;
}

export interface IVosConfigurationReferenceRepository {
  findByVosId(vosId: string): Promise<IVosConfigurationReference | null>;
  create(ref: Omit<IVosConfigurationReference, 'id' | 'publicId' | 'createdAt'>): Promise<IVosConfigurationReference>;
}

export interface IVosLinksRepository {
  findByVosId(vosId: string, module?: string): Promise<IVosLink[]>;
  findByEntity(entityModule: string, entityType: string, entityId: string): Promise<IVosLink[]>;
  create(link: Omit<IVosLink, 'id' | 'publicId' | 'linkedAt'>): Promise<IVosLink>;
  softDelete(id: string): Promise<boolean>;
}

export interface IVosAttributesRepository {
  findByVosId(vosId: string): Promise<IVosAttribute[]>;
  findByName(vosId: string, attributeName: string): Promise<IVosAttribute | null>;
  create(attribute: Omit<IVosAttribute, 'id' | 'publicId' | 'capturedAt' | 'createdAt'>): Promise<IVosAttribute>;
}

export interface IVosTagsRepository {
  findByVosId(vosId: string): Promise<IVosTag[]>;
  findByCategory(category: string): Promise<IVosTag[]>;
  create(tag: Omit<IVosTag, 'id' | 'publicId' | 'createdAt'>): Promise<IVosTag>;
  delete(id: string): Promise<boolean>;
}
