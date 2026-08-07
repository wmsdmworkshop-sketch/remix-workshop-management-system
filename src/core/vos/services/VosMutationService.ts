/**
 * DWIP Enterprise WOS - VosMutationService
 * Task 1.2 Mutable Field Updates & Optimistic Locking Service
 */

import { IVosRepository } from '../../../domain/vos/repositories';
import { IVos } from '../../../domain/vos/types';
import { VosValidationService } from './VosValidationService';
import { StructuredLogger } from '../utils/StructuredLogger';
import { vosAuditEngine } from '../audit/VosAuditEngine';

export interface UpdateVosRequest {
  id: string;
  expectedVersion: number;
  updatedBy: string;
  priority?: IVos['priority'];
  riskLevel?: IVos['riskLevel'];
  riskScore?: number;
  riskReason?: string;
  operationalStatus?: string;
  currentOwner?: string;
  [key: string]: any;
}

export class VosMutationService {
  constructor(
    private vosRepository: IVosRepository,
    private validationService: VosValidationService
  ) {}

  public async updateMutableFields(
    request: UpdateVosRequest,
    correlationId?: string
  ): Promise<IVos> {
    const startTime = Date.now();
    const { id, expectedVersion, updatedBy, ...updatePayload } = request;

    const updateKeys = Object.keys(updatePayload);

    // 1. Business Validation: Immutable intake field check
    this.validationService.validateImmutableProtection(updateKeys);

    // 2. Business Validation: Allow-list check
    this.validationService.validateAllowListMutations(updateKeys);

    // 3. Structural Validation on values
    this.validationService.validateStructural(updatePayload);

    // 4. Fetch existing VOS
    const existing = await this.vosRepository.findById(id);
    if (!existing) {
      throw new Error(`[VosMutationService] VOS ${id} not found`);
    }

    // 5. Business Validation: Closed VOS check
    this.validationService.validateClosedSession(existing);

    // 6. Business Validation: Optimistic Locking version check
    this.validationService.validateOptimisticLock(existing, expectedVersion);

    // 7. Perform Mutation with incremented version
    const newVersion = existing.version + 1;
    const updated = await this.vosRepository.update(id, {
      ...updatePayload,
      updatedBy,
      version: newVersion,
      updatedAt: new Date().toISOString()
    });

    // Audit Engine Integration: Record field-level changes post-mutation
    try {
      await vosAuditEngine.recordChange(
        'vos',
        existing.id,
        existing,
        updated,
        updatedBy,
        'workshop_staff',
        updatePayload.riskReason || 'VOS Mutable Field Update',
        correlationId
      );
    } catch {
      // Non-blocking audit recording guard
    }

    StructuredLogger.info(`VOS ${id} mutated successfully to version ${newVersion}`, {
      correlationId,
      vosId: updated.id,
      publicId: updated.publicId,
      companyId: updated.companyId,
      dealerId: updated.dealerId,
      branchId: updated.branchId,
      userId: updatedBy,
      component: 'VosMutationService',
      operation: 'updateMutableFields',
      durationMs: Date.now() - startTime,
      result: 'SUCCESS',
      updatedKeys: updateKeys,
      newVersion
    });

    return updated;
  }
}
